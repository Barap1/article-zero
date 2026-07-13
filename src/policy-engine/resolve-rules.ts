import type { PolicyEffect } from "../domain/catalogs";
import type { AgentAction, ConditionResult, EvaluationContext, PolicyBundle, PolicyCondition, PolicyRule, RuleEvaluation } from "../domain/schemas";
import { evaluateCondition } from "./evaluate-condition";
import { resolveFact } from "./fact-resolver";

type Candidate = {
  readonly rule: PolicyRule;
  readonly effect: PolicyEffect;
  readonly state: "MATCH" | "INDETERMINATE";
  readonly index: number;
};

export type RuleResolution = {
  readonly effect: PolicyEffect;
  readonly appliedRuleIds: string[];
  readonly overriddenRuleIds: string[];
  readonly ruleEvaluations: RuleEvaluation[];
  readonly allowedFields: string[];
  readonly reasonCode: string;
};

function effectRank(effect: PolicyEffect): number {
  switch (effect) {
    case "DENY":
      return 4;
    case "REQUIRE_HUMAN_APPROVAL":
      return 3;
    case "ALLOW_WITH_FIELD_FILTER":
      return 2;
    case "ALLOW":
      return 1;
  }
}

function defaultEffect(action: AgentAction, bundle: PolicyBundle): { readonly effect: PolicyEffect; readonly reasonCode: string } {
  switch (action.tool) {
    case "disclose_patient_data":
    case "trigger_emergency_alert":
      return { effect: bundle.defaults.noMatchingRuleForCriticalTool, reasonCode: "NO_MATCHING_CRITICAL_RULE" };
    case "read_patient_record":
    case "send_staff_message":
      return { effect: bundle.defaults.noMatchingRuleForHighRiskTool, reasonCode: "NO_MATCHING_HIGH_RISK_RULE" };
    case "request_human_approval":
    case "search_patients":
    case "verify_responder_credentials":
    case "write_audit_event":
      return { effect: bundle.defaults.noMatchingRuleForLowRiskTool, reasonCode: "NO_MATCHING_LOW_RISK_RULE" };
  }
}

function evaluateRuleCondition(ruleId: string, condition: PolicyCondition, action: AgentAction, context: EvaluationContext): ConditionResult {
  const actual = resolveFact(condition.fact, action, context);
  if (condition.operator === "EQUALS" && condition.value === null && actual !== null) {
    return {
      ruleId,
      conditionId: condition.id,
      fact: condition.fact,
      operator: condition.operator,
      expected: condition.value,
      actual,
      result: "FALSE",
      explanation: `${condition.label}: actual ${JSON.stringify(actual)}, expected null, result FALSE`,
    };
  }

  return evaluateCondition({ ruleId, condition, action, context });
}

function evaluateRule(rule: PolicyRule, action: AgentAction, context: EvaluationContext): RuleEvaluation {
  if (!rule.enabled) {
    return {
      ruleId: rule.id,
      priority: rule.priority,
      state: "DISABLED",
      conditionResults: [],
      candidateEffect: null,
      overridden: false,
      overriddenByRuleId: null,
    };
  }

  const conditionResults = rule.conditions.map((condition) => evaluateRuleCondition(rule.id, condition, action, context));
  const state = conditionResults.some((result) => result.result === "FALSE")
    ? "NO_MATCH"
    : conditionResults.some((result) => result.result === "UNKNOWN")
      ? "INDETERMINATE"
      : "MATCH";

  return {
    ruleId: rule.id,
    priority: rule.priority,
    state,
    conditionResults,
    candidateEffect: state === "MATCH" ? rule.effect : state === "INDETERMINATE" ? rule.onIndeterminate : null,
    overridden: false,
    overriddenByRuleId: null,
  };
}

function intersectAllowedFields(candidates: readonly Candidate[]): string[] {
  const [first, ...rest] = candidates;
  if (first === undefined) {
    return [];
  }

  return first.rule.allowedFields.filter((field) => rest.every((candidate) => candidate.rule.allowedFields.includes(field)));
}

export function resolveRules(input: {
  readonly action: AgentAction;
  readonly context: EvaluationContext;
  readonly bundle: PolicyBundle;
}): RuleResolution {
  const applicableRules = input.bundle.rules.filter((rule) => rule.appliesToTools.includes(input.action.tool));
  const ruleEvaluations = applicableRules.map((rule) => evaluateRule(rule, input.action, input.context));
  const candidates: Candidate[] = ruleEvaluations.flatMap((evaluation, index) => {
    if (evaluation.candidateEffect === null || evaluation.state === "NO_MATCH" || evaluation.state === "DISABLED") {
      return [];
    }

    const rule = applicableRules[index];
    if (rule === undefined) {
      return [];
    }

    return [{ rule, effect: evaluation.candidateEffect, state: evaluation.state, index }];
  });
  const sortedCandidates = [...candidates].sort((left, right) => right.rule.priority - left.rule.priority || left.index - right.index);
  const overriddenBy = new Map<string, string>();

  for (const candidate of sortedCandidates) {
    if (candidate.state !== "MATCH") {
      continue;
    }

    for (const targetRuleId of candidate.rule.overridesRuleIds) {
      const target = candidates.find((other) => other.rule.id === targetRuleId);
      if (target !== undefined && candidate.rule.priority >= target.rule.priority && !overriddenBy.has(targetRuleId)) {
        overriddenBy.set(targetRuleId, candidate.rule.id);
      }
    }
  }

  const resolvedEvaluations = ruleEvaluations.map((evaluation) => {
    const overridingRuleId = overriddenBy.get(evaluation.ruleId);
    return overridingRuleId === undefined
      ? evaluation
      : { ...evaluation, overridden: true, overriddenByRuleId: overridingRuleId };
  });
  const remainingCandidates = sortedCandidates.filter((candidate) => !overriddenBy.has(candidate.rule.id));

  if (remainingCandidates.length === 0) {
    const fallback = defaultEffect(input.action, input.bundle);
    return {
      effect: fallback.effect,
      appliedRuleIds: [],
      overriddenRuleIds: [...overriddenBy.keys()],
      ruleEvaluations: resolvedEvaluations,
      allowedFields: [],
      reasonCode: fallback.reasonCode,
    };
  }

  const highestPriority = remainingCandidates[0]?.rule.priority;
  const winningCandidates = remainingCandidates.filter((candidate) => candidate.rule.priority === highestPriority);
  const effect = winningCandidates.reduce<PolicyEffect>(
    (mostRestrictive, candidate) => (effectRank(candidate.effect) > effectRank(mostRestrictive) ? candidate.effect : mostRestrictive),
    winningCandidates[0]?.effect ?? "DENY",
  );
  const conflict = winningCandidates.some((candidate) => candidate.effect !== effect);

  return {
    effect,
    appliedRuleIds: winningCandidates.map((candidate) => candidate.rule.id),
    overriddenRuleIds: [...overriddenBy.keys()],
    ruleEvaluations: resolvedEvaluations,
    allowedFields: effect === "ALLOW_WITH_FIELD_FILTER" ? intersectAllowedFields(winningCandidates) : [],
    reasonCode: conflict ? "EQUAL_PRIORITY_MOST_RESTRICTIVE" : "MATCHED_RULE",
  };
}
