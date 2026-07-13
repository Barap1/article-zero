import type { PatientField, PolicyEffect } from "../domain/catalogs";
import { PolicyBundleSchema, PolicyDecisionSchema } from "../domain/schemas";
import type { AgentAction, EvaluationContext, ISODateTime, PolicyBundle, PolicyDecision, TraceStep } from "../domain/schemas";
import { resolveRules } from "./resolve-rules";

function disclosureFields(action: AgentAction, effect: PolicyEffect, allowedFields: readonly string[]): {
  readonly outcome: PolicyEffect;
  readonly reasonCode: string | null;
  readonly permittedFields: PatientField[];
  readonly deniedFields: PatientField[];
} {
  if (action.tool !== "disclose_patient_data") {
    return { outcome: effect, reasonCode: null, permittedFields: [], deniedFields: [] };
  }

  if (effect === "ALLOW") {
    return { outcome: effect, reasonCode: null, permittedFields: [...action.requestedFields], deniedFields: [] };
  }

  if (effect === "ALLOW_WITH_FIELD_FILTER") {
    const permittedFields = action.requestedFields.filter((field) => allowedFields.includes(field));
    const deniedFields = action.requestedFields.filter((field) => !permittedFields.includes(field));
    return permittedFields.length === 0
      ? { outcome: "DENY", reasonCode: "EMPTY_FILTERED_DISCLOSURE", permittedFields, deniedFields }
      : { outcome: effect, reasonCode: null, permittedFields, deniedFields };
  }

  return { outcome: effect, reasonCode: null, permittedFields: [], deniedFields: [...action.requestedFields] };
}

function humanExplanation(outcome: PolicyEffect, reasonCode: string, appliedRuleIds: readonly string[]): string {
  const rules = appliedRuleIds.length === 0 ? "No policy rule produced a candidate" : `Applied rules: ${appliedRuleIds.join(", ")}`;
  return `${outcome}: ${reasonCode}. ${rules}.`;
}

export function evaluatePolicy(input: {
  readonly action: AgentAction;
  readonly context: EvaluationContext;
  readonly bundle: PolicyBundle;
  readonly now: ISODateTime;
  readonly decisionId: string;
}): PolicyDecision {
  const bundle = PolicyBundleSchema.parse(input.bundle);
  const resolution = resolveRules({ action: input.action, context: input.context, bundle });
  const fields = disclosureFields(input.action, resolution.effect, resolution.allowedFields);
  const outcome = fields.outcome;
  const reasonCode = fields.reasonCode ?? resolution.reasonCode;
  const trace: TraceStep[] = [];
  const addTrace = (
    phase: TraceStep["phase"],
    status: TraceStep["status"],
    title: string,
    detail: string,
    relatedRuleIds: string[],
  ): void => {
    trace.push({ id: `${input.decisionId}.trace.${trace.length + 1}`, order: trace.length + 1, phase, status, title, detail, relatedRuleIds });
  };

  addTrace("REQUEST", "info", "Policy request received", `Evaluating ${input.action.tool} for action ${input.action.id}.`, []);
  addTrace("FACTS", "info", "Trusted context supplied", "Policy conditions use the supplied evaluation context.", []);
  for (const evaluation of resolution.ruleEvaluations) {
    addTrace(
      "RULE_EVALUATION",
      evaluation.state === "MATCH" ? "pass" : evaluation.state === "INDETERMINATE" ? "warning" : "fail",
      `Rule ${evaluation.ruleId} is ${evaluation.state}`,
      evaluation.candidateEffect === null ? "No candidate was created." : `Candidate outcome: ${evaluation.candidateEffect}.`,
      [evaluation.ruleId],
    );
  }
  addTrace(
    "RESOLUTION",
    outcome === "DENY" ? "fail" : outcome === "REQUIRE_HUMAN_APPROVAL" ? "warning" : "pass",
    `Resolved outcome: ${outcome}`,
    `${reasonCode}.`,
    resolution.appliedRuleIds,
  );
  if (input.action.tool === "disclose_patient_data") {
    addTrace(
      "FIELD_FILTER",
      fields.permittedFields.length === 0 ? "fail" : "pass",
      "Disclosure field decision",
      `Permitted: ${fields.permittedFields.join(", ") || "none"}. Denied: ${fields.deniedFields.join(", ") || "none"}.`,
      resolution.appliedRuleIds,
    );
  }
  const toolExecutionPermitted = outcome === "ALLOW" || outcome === "ALLOW_WITH_FIELD_FILTER";
  addTrace(
    "TOOL_GATE",
    toolExecutionPermitted ? "pass" : outcome === "REQUIRE_HUMAN_APPROVAL" ? "warning" : "fail",
    toolExecutionPermitted ? "Tool execution permitted" : "Tool execution blocked",
    toolExecutionPermitted ? "The policy outcome allows this action." : "The protected tool must not execute.",
    resolution.appliedRuleIds,
  );

  return PolicyDecisionSchema.parse({
    id: input.decisionId,
    evaluatedAt: input.now,
    actionId: input.action.id,
    bundleId: bundle.bundleId,
    outcome,
    reasonCode,
    humanExplanation: humanExplanation(outcome, reasonCode, resolution.appliedRuleIds),
    requestedFields: input.action.tool === "disclose_patient_data" ? [...input.action.requestedFields] : [],
    permittedFields: fields.permittedFields,
    deniedFields: fields.deniedFields,
    appliedRuleIds: resolution.appliedRuleIds,
    overriddenRuleIds: resolution.overriddenRuleIds,
    ruleEvaluations: resolution.ruleEvaluations,
    trace,
    requiresApproval: outcome === "REQUIRE_HUMAN_APPROVAL",
    toolExecutionPermitted,
  });
}
