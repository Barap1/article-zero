import { PATIENT_FIELDS, type PatientField, type Severity } from "../domain/catalogs";
import {
  ConstitutionVersionSchema,
  RegressionTestCaseSchema,
  TestRunSchema,
  type ConstitutionVersion,
  type RegressionTestCase,
  type RegressionTestResult,
  type TestRun,
} from "../domain/schemas";
import { ATTACK_SCENARIOS } from "../hospital/fixtures/scenarios";
import { createId } from "../lib/ids";
import { evaluatePolicy } from "../policy-engine/evaluate-policy";
import { hashPolicyBundle } from "../policy-engine/hash-policy-bundle";

class RegressionScenarioNotFoundError extends Error {
  readonly scenarioId: string;

  constructor(scenarioId: string) {
    super(`Regression scenario ${scenarioId} is not seeded.`);
    this.name = "RegressionScenarioNotFoundError";
    this.scenarioId = scenarioId;
  }
}

function canonicalFields(fields: readonly PatientField[]): PatientField[] {
  return PATIENT_FIELDS.filter((field) => fields.includes(field));
}

function blocksActivation(severity: Severity): boolean {
  return severity === "critical" || severity === "high";
}

export async function runRegressionSuite(input: {
  readonly version: ConstitutionVersion;
  readonly cases: readonly RegressionTestCase[];
  readonly now?: () => Date;
  readonly idFactory?: () => string;
}): Promise<TestRun> {
  const version = ConstitutionVersionSchema.parse(input.version);
  const cases = RegressionTestCaseSchema.array().parse(input.cases);
  const now = input.now ?? (() => new Date());
  const idFactory = input.idFactory ?? createId;
  const startedAt = now().toISOString();
  const results: RegressionTestResult[] = cases.map((testCase) => {
    const scenario = ATTACK_SCENARIOS.find((candidate) => candidate.id === testCase.scenarioId);
    if (!scenario) throw new RegressionScenarioNotFoundError(testCase.scenarioId);

    const decision = evaluatePolicy({
      action: scenario.fallbackAction,
      context: scenario.evaluationContext,
      bundle: version.policyBundle,
      now: startedAt,
      decisionId: `decision.${idFactory()}`,
    });
    const expectedPermittedFields = canonicalFields(testCase.expectedPermittedFields);
    const actualPermittedFields = canonicalFields(decision.permittedFields);
    const passed = decision.outcome === testCase.expectedOutcome
      && actualPermittedFields.length === expectedPermittedFields.length
      && actualPermittedFields.every((field, index) => field === expectedPermittedFields[index]);

    return {
      testCaseId: testCase.id,
      passed,
      severity: testCase.severity,
      expectedOutcome: testCase.expectedOutcome,
      actualOutcome: decision.outcome,
      expectedPermittedFields,
      actualPermittedFields,
      decisionId: decision.id,
      failureDetail: passed ? null : `Expected ${testCase.expectedOutcome} with ${expectedPermittedFields.join(", ") || "no fields"}; received ${decision.outcome} with ${actualPermittedFields.join(", ") || "no fields"}.`,
    };
  });

  return TestRunSchema.parse({
    id: `test-run.${idFactory()}`,
    constitutionVersionId: version.id,
    bundleHash: await hashPolicyBundle(version.policyBundle),
    startedAt,
    completedAt: now().toISOString(),
    results,
    blockingFailureCount: results.filter((result) => !result.passed && blocksActivation(result.severity)).length,
    warningFailureCount: results.filter((result) => !result.passed && result.severity === "warning").length,
  });
}
