import { PATIENT_FIELDS, type PatientField } from "../domain/catalogs";
import type { ConstitutionVersion, RegressionTestCase, RegressionTestResult } from "../domain/schemas";
import { ATTACK_SCENARIOS } from "../hospital/fixtures/scenarios";
import { formatDisplayLabel } from "../lib/display-label";
import { evaluatePolicy } from "../policy-engine/evaluate-policy";

export type RegressionRemediation = {
  readonly testCaseId: string;
  readonly testName: string;
  readonly summary: string;
  readonly sourceClauseId: string;
  readonly sourceRuleIds: readonly string[];
  readonly missingFields: readonly PatientField[];
  readonly unexpectedFields: readonly PatientField[];
  readonly suggestedClauseText: string;
};

function difference(fields: readonly PatientField[], comparedWith: readonly PatientField[]): PatientField[] {
  return PATIENT_FIELDS.filter((field) => fields.includes(field) && !comparedWith.includes(field));
}

function humanList(fields: readonly PatientField[]): string {
  const labels = fields.map(formatDisplayLabel);
  if (labels.length === 0) return "no fields";
  if (labels.length === 1) return labels[0] ?? "no fields";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function clauseFieldLabel(field: PatientField): string {
  if (field === "currentEmergencyMedications") return "current emergency medications";
  return formatDisplayLabel(field).toLowerCase();
}

function clauseFieldList(fields: readonly PatientField[]): string {
  const labels = fields.map(clauseFieldLabel);
  if (labels.length === 0) return "no fields";
  if (labels.length === 1) return labels[0] ?? "no fields";
  if (labels.length === 2) return labels[0] + " and " + labels[1];
  return labels.slice(0, -1).join(", ") + ", and " + labels[labels.length - 1];
}

function diagnosis(input: {
  readonly expectedOutcome: RegressionTestResult["expectedOutcome"];
  readonly actualOutcome: RegressionTestResult["actualOutcome"];
  readonly missingFields: readonly PatientField[];
  readonly unexpectedFields: readonly PatientField[];
}): string {
  const sentences: string[] = [];
  if (input.missingFields.length > 0) {
    sentences.push(`${humanList(input.missingFields)} ${input.missingFields.length === 1 ? "is" : "are"} missing from the expected disclosure.`);
  }
  if (input.unexpectedFields.length > 0) {
    sentences.push(`Unexpected fields are being disclosed: ${humanList(input.unexpectedFields)}.`);
  }
  if (input.expectedOutcome !== input.actualOutcome) {
    sentences.push(`The test expected ${formatDisplayLabel(input.expectedOutcome).toLowerCase()}, but the policy produced ${formatDisplayLabel(input.actualOutcome).toLowerCase()}.`);
  }
  return sentences.join(" ") || "The policy result does not match the expected behavior for this test.";
}

function suggestedClause(input: {
  readonly expectedOutcome: RegressionTestResult["expectedOutcome"];
  readonly expectedFields: readonly PatientField[];
  readonly actorRole: string;
  readonly threatToLife: boolean | null;
  readonly identityVerified: boolean | null;
}): string {
  const role = formatDisplayLabel(input.actorRole).toLowerCase();
  const subject = input.identityVerified === true ? `a verified ${role}` : `the ${role}`;
  const emergency = input.threatToLife === true ? "during a credible and imminent threat to life" : "when the test scenario's required safeguards are satisfied";
  const fields = clauseFieldList(input.expectedFields);

  if (input.expectedOutcome === "ALLOW_WITH_FIELD_FILTER") {
    return `For ${subject} ${emergency}, disclose only the minimum necessary patient information: ${fields}. Do not disclose any other patient fields; if the required facts cannot be verified, require human approval or deny access.`;
  }
  if (input.expectedOutcome === "DENY") {
    return `For ${subject} ${emergency}, deny the request and disclose no patient fields unless every required policy safeguard is satisfied.`;
  }
  if (input.expectedOutcome === "REQUIRE_HUMAN_APPROVAL") {
    return `For ${subject} ${emergency}, require human approval before disclosing patient information, and disclose only the minimum necessary fields after approval.`;
  }
  return `For ${subject} ${emergency}, allow only the patient information required by the approved policy purpose.`;
}

export function deriveRegressionRemediation(input: {
  readonly version: ConstitutionVersion;
  readonly testCase: RegressionTestCase;
  readonly result: RegressionTestResult;
}): RegressionRemediation | null {
  if (input.result.passed) return null;

  const scenario = ATTACK_SCENARIOS.find((candidate) => candidate.id === input.testCase.scenarioId);
  if (scenario === undefined) return null;

  const missingFields = difference(input.result.expectedPermittedFields, input.result.actualPermittedFields);
  const unexpectedFields = difference(input.result.actualPermittedFields, input.result.expectedPermittedFields);
  const applicableRules = input.version.policyBundle.rules.filter((rule) => rule.appliesToTools.includes(scenario.fallbackAction.tool));
  const decision = evaluatePolicy({
    action: scenario.fallbackAction,
    context: scenario.evaluationContext,
    bundle: input.version.policyBundle,
    now: "2026-01-01T00:00:00.000Z",
    decisionId: `remediation.${input.testCase.id}`,
  });
  const appliedRuleIds = new Set(decision.appliedRuleIds);
  const affectedRules = applicableRules.filter((rule) => appliedRuleIds.has(rule.id));
  const sourceRules = affectedRules.length > 0 ? affectedRules : applicableRules;
  const sourceClauseId = sourceRules[0]?.sourceClauseId ?? input.version.clauses[0]?.id;
  if (sourceClauseId === undefined) return null;

  return {
    testCaseId: input.testCase.id,
    testName: input.testCase.name,
    summary: diagnosis({ expectedOutcome: input.result.expectedOutcome, actualOutcome: input.result.actualOutcome, missingFields, unexpectedFields }),
    sourceClauseId,
    sourceRuleIds: sourceRules.map((rule) => rule.id),
    missingFields,
    unexpectedFields,
    suggestedClauseText: suggestedClause({
      expectedOutcome: input.result.expectedOutcome,
      expectedFields: input.result.expectedPermittedFields,
      actorRole: scenario.evaluationContext.actor.role,
      threatToLife: scenario.evaluationContext.emergency.threatToLife,
      identityVerified: scenario.evaluationContext.actor.identityVerified,
    }),
  };
}
