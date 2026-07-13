import { describe, expect, it } from "vitest";

import { MINIMUM_EMERGENCY_FIELDS, PATIENT_FIELDS } from "../../../src/domain/catalogs";
import type { AgentAction, EvaluationContext, PolicyBundle, PolicyRule } from "../../../src/domain/schemas";
import { CORRECTED_POLICY_BUNDLE, LEGACY_POLICY_BUNDLE } from "../../../src/hospital/fixtures/constitution";
import { HERO_ATTACK_SCENARIO, LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO } from "../../../src/hospital/fixtures/scenarios";
import { evaluatePolicy } from "../../../src/policy-engine/evaluate-policy";

const NOW = "2026-07-13T12:00:00.000Z";

const defaults: PolicyBundle["defaults"] = {
  noMatchingRuleForCriticalTool: "DENY",
  noMatchingRuleForHighRiskTool: "REQUIRE_HUMAN_APPROVAL",
  noMatchingRuleForLowRiskTool: "DENY",
  equalPriorityConflict: "MOST_RESTRICTIVE",
  emptyFilteredDisclosure: "DENY",
};

const baseRule: PolicyRule = {
  id: "rule.test",
  sourceClauseId: "clause.test",
  name: "Test rule",
  description: "A deterministic test rule.",
  priority: 50,
  appliesToTools: ["disclose_patient_data"],
  conditionMode: "ALL",
  conditions: [],
  effect: "ALLOW",
  allowedFields: [],
  onIndeterminate: "DENY",
  overridesRuleIds: [],
  severity: "critical",
  enabled: true,
};

function rule(overrides: Partial<PolicyRule>): PolicyRule {
  return { ...baseRule, ...overrides };
}

function bundle(rules: PolicyRule[]): PolicyBundle {
  return { schemaVersion: 1, bundleId: "bundle.test", versionLabel: "Test", rules, defaults };
}

function evaluate(
  action: AgentAction,
  context: EvaluationContext,
  policyBundle: PolicyBundle,
  decisionId: string,
) {
  return evaluatePolicy({ action, context, bundle: policyBundle, now: NOW, decisionId });
}

describe("evaluatePolicy", () => {
  it("Given no matching critical-tool rule, When evaluated, Then denies by the default", () => {
    const decision = evaluate(HERO_ATTACK_SCENARIO.fallbackAction, HERO_ATTACK_SCENARIO.evaluationContext, bundle([]), "decision.default-deny");

    expect(decision.outcome).toBe("DENY");
    expect(decision.toolExecutionPermitted).toBe(false);
  });

  it("Given no matching high-risk rule, When evaluated, Then requires human approval", () => {
    const action: AgentAction = { ...HERO_ATTACK_SCENARIO.fallbackAction, tool: "read_patient_record" };
    const decision = evaluate(action, HERO_ATTACK_SCENARIO.evaluationContext, bundle([]), "decision.default-approval");

    expect(decision.outcome).toBe("REQUIRE_HUMAN_APPROVAL");
    expect(decision.requiresApproval).toBe(true);
    expect(decision.toolExecutionPermitted).toBe(false);
  });

  it("Given a higher-priority matching override, When evaluated, Then it removes the named lower rule", () => {
    const decision = evaluate(
      HERO_ATTACK_SCENARIO.fallbackAction,
      HERO_ATTACK_SCENARIO.evaluationContext,
      bundle([
        rule({ id: "rule.lower", effect: "DENY" }),
        rule({ id: "rule.higher", priority: 60, overridesRuleIds: ["rule.lower"] }),
      ]),
      "decision.override",
    );

    expect(decision.outcome).toBe("ALLOW");
    expect(decision.overriddenRuleIds).toEqual(["rule.lower"]);
  });

  it("Given an override whose target is absent, When evaluated, Then it does not mark any rule overridden", () => {
    const decision = evaluate(
      HERO_ATTACK_SCENARIO.fallbackAction,
      HERO_ATTACK_SCENARIO.evaluationContext,
      bundle([rule({ id: "rule.lower", effect: "DENY" }), rule({ id: "rule.higher", priority: 60, overridesRuleIds: ["rule.absent"] })]),
      "decision.absent-override",
    );

    expect(decision.outcome).toBe("ALLOW");
    expect(decision.overriddenRuleIds).toEqual([]);
  });

  it("Given equal-priority allow and deny candidates, When evaluated, Then deny wins", () => {
    const decision = evaluate(
      HERO_ATTACK_SCENARIO.fallbackAction,
      HERO_ATTACK_SCENARIO.evaluationContext,
      bundle([rule({ id: "rule.allow" }), rule({ id: "rule.deny", effect: "DENY" })]),
      "decision.equal-priority-deny",
    );

    expect(decision.outcome).toBe("DENY");
  });

  it("Given equal-priority field filters, When evaluated, Then intersects their allowlists in requested-field order", () => {
    const decision = evaluate(
      HERO_ATTACK_SCENARIO.fallbackAction,
      HERO_ATTACK_SCENARIO.evaluationContext,
      bundle([
        rule({ id: "rule.filter-a", effect: "ALLOW_WITH_FIELD_FILTER", allowedFields: ["fullName", "bloodType"] }),
        rule({ id: "rule.filter-b", effect: "ALLOW_WITH_FIELD_FILTER", allowedFields: ["bloodType", "criticalAllergies"] }),
      ]),
      "decision.filter-intersection",
    );

    expect(decision.outcome).toBe("ALLOW_WITH_FIELD_FILTER");
    expect(decision.permittedFields).toEqual(["bloodType"]);
    expect(decision.deniedFields).toEqual(PATIENT_FIELDS.filter((field) => field !== "bloodType"));
  });

  it("Given an indeterminate critical rule, When evaluated, Then applies its approval fallback", () => {
    const context: EvaluationContext = {
      ...HERO_ATTACK_SCENARIO.evaluationContext,
      actor: { ...HERO_ATTACK_SCENARIO.evaluationContext.actor, identityVerified: null },
    };
    const decision = evaluate(
      HERO_ATTACK_SCENARIO.fallbackAction,
      context,
      bundle([
        rule({
          conditions: [{ id: "condition.identity", fact: "actor.identityVerified", operator: "EQUALS", value: true, label: "Identity verified" }],
          onIndeterminate: "REQUIRE_HUMAN_APPROVAL",
        }),
      ]),
      "decision.indeterminate",
    );

    expect(decision.outcome).toBe("REQUIRE_HUMAN_APPROVAL");
    expect(decision.ruleEvaluations[0]?.state).toBe("INDETERMINATE");
  });

  it("Given field filters with no requested fields permitted, When evaluated, Then denies the empty disclosure", () => {
    const action: AgentAction = { ...HERO_ATTACK_SCENARIO.fallbackAction, requestedFields: ["bloodType"] };
    const decision = evaluate(
      action,
      HERO_ATTACK_SCENARIO.evaluationContext,
      bundle([rule({ effect: "ALLOW_WITH_FIELD_FILTER", allowedFields: ["homeAddress"] })]),
      "decision.empty-filter",
    );

    expect(decision.outcome).toBe("DENY");
    expect(decision.permittedFields).toEqual([]);
    expect(decision.deniedFields).toEqual(["bloodType"]);
  });

  it("Given the legacy hero bundle, When the fake-responder action is evaluated, Then it permits the full record with a sequential trace", () => {
    const decision = evaluate(HERO_ATTACK_SCENARIO.fallbackAction, HERO_ATTACK_SCENARIO.evaluationContext, LEGACY_POLICY_BUNDLE, "decision.legacy");

    expect(decision.outcome).toBe("ALLOW");
    expect(decision.permittedFields).toEqual(PATIENT_FIELDS);
    expect(decision.trace.map((step) => step.order)).toEqual(decision.trace.map((_, index) => index + 1));
    expect(decision.humanExplanation).toContain("ALLOW");
  });

  it("Given the corrected hero bundle, When the fake-responder action is evaluated, Then it denies execution", () => {
    const decision = evaluate(HERO_ATTACK_SCENARIO.fallbackAction, HERO_ATTACK_SCENARIO.evaluationContext, CORRECTED_POLICY_BUNDLE, "decision.corrected");

    expect(decision.outcome).toBe("DENY");
    expect(decision.toolExecutionPermitted).toBe(false);
  });

  it("Given the corrected bundle, When the verified responder action is evaluated, Then permits exactly the minimum emergency fields", () => {
    const decision = evaluate(
      LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.fallbackAction,
      LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.evaluationContext,
      CORRECTED_POLICY_BUNDLE,
      "decision.verified-responder",
    );

    expect(decision.outcome).toBe("ALLOW_WITH_FIELD_FILTER");
    expect(decision.permittedFields).toEqual(MINIMUM_EMERGENCY_FIELDS);
    expect(decision.toolExecutionPermitted).toBe(true);
  });
});
