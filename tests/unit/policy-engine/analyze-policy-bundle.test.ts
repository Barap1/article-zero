import { describe, expect, it } from "vitest";

import type { PolicyBundle, PolicyCondition, PolicyRule } from "../../../src/domain/schemas";
import { CORRECTED_POLICY_BUNDLE, LEGACY_POLICY_BUNDLE } from "../../../src/hospital/fixtures/constitution";
import { analyzePolicyBundle } from "../../../src/policy-engine/analyze-policy-bundle";

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
  effect: "DENY",
  allowedFields: [],
  onIndeterminate: "DENY",
  overridesRuleIds: [],
  severity: "critical",
  enabled: true,
};

function rule(overrides: Partial<PolicyRule> = {}): PolicyRule {
  return { ...baseRule, ...overrides };
}

function bundle(rules: PolicyRule[]): PolicyBundle {
  return { schemaVersion: 1, bundleId: "bundle.test", versionLabel: "Test", rules, defaults };
}

function issueCodes(policyBundle: PolicyBundle): string[] {
  return analyzePolicyBundle(policyBundle).map((issue) => issue.code);
}

function expectIssue(code: string, policyBundle: PolicyBundle): void {
  expect(issueCodes(policyBundle)).toContain(code);
}

describe("analyzePolicyBundle", () => {
  it("reports DUPLICATE_RULE_ID", () => {
    expectIssue("DUPLICATE_RULE_ID", bundle([rule(), rule()]));
  });

  it("reports DUPLICATE_CONDITION_ID", () => {
    const condition: PolicyCondition = { id: "condition.same", fact: "actor.role", operator: "EQUALS", value: "hospital_staff", label: "Role" };
    expectIssue("DUPLICATE_CONDITION_ID", bundle([rule({ conditions: [condition, { ...condition, fact: "tool.name", value: "disclose_patient_data" }] })]));
  });

  it("reports INVALID_PRIORITY", () => {
    const invalidRule = rule();
    Reflect.set(invalidRule, "priority", 101);
    expectIssue("INVALID_PRIORITY", bundle([invalidRule]));
  });

  it("reports UNSUPPORTED_CATALOG_VALUE", () => {
    const invalidRule = rule({ conditions: [{ id: "condition.invalid", fact: "actor.role", operator: "EQUALS", value: "hospital_staff", label: "Role" }] });
    const condition = invalidRule.conditions[0];
    if (condition === undefined) throw new Error("test condition missing");
    Reflect.set(condition, "fact", "actor.unknown");
    expectIssue("UNSUPPORTED_CATALOG_VALUE", bundle([invalidRule]));
  });

  it("reports FILTER_WITHOUT_FIELDS", () => {
    expectIssue("FILTER_WITHOUT_FIELDS", bundle([rule({ effect: "ALLOW_WITH_FIELD_FILTER" })]));
  });

  it("reports FIELDS_ON_NON_FILTER_EFFECT", () => {
    expectIssue("FIELDS_ON_NON_FILTER_EFFECT", bundle([rule({ allowedFields: ["fullName"] })]));
  });

  it("reports DANGLING_OVERRIDE", () => {
    expectIssue("DANGLING_OVERRIDE", bundle([rule({ overridesRuleIds: ["rule.missing"] })]));
  });

  it("reports SELF_OVERRIDE", () => {
    expectIssue("SELF_OVERRIDE", bundle([rule({ overridesRuleIds: ["rule.test"] })]));
  });

  it("reports LOWER_PRIORITY_OVERRIDE", () => {
    expectIssue("LOWER_PRIORITY_OVERRIDE", bundle([rule({ id: "rule.high", priority: 80 }), rule({ id: "rule.low", priority: 40, overridesRuleIds: ["rule.high"] })]));
  });

  it("reports EQUAL_PRIORITY_CONFLICT", () => {
    expectIssue("EQUAL_PRIORITY_CONFLICT", bundle([rule({ id: "rule.allow", effect: "ALLOW" }), rule({ id: "rule.deny" })]));
  });

  it("reports UNCONDITIONAL_PRIVACY_OVERRIDE", () => {
    expectIssue("UNCONDITIONAL_PRIVACY_OVERRIDE", bundle([rule({ id: "rule.deny", effect: "DENY" }), rule({ id: "rule.allow", effect: "ALLOW", overridesRuleIds: ["rule.deny"] })]));
  });

  it("reports UNVERIFIED_EMERGENCY_OVERRIDE", () => {
    expectIssue("UNVERIFIED_EMERGENCY_OVERRIDE", LEGACY_POLICY_BUNDLE);
  });

  it("reports BREAK_GLASS_TOO_BROAD", () => {
    expectIssue("BREAK_GLASS_TOO_BROAD", CORRECTED_POLICY_BUNDLE);
  });

  it("reports NO_MINIMUM_DISCLOSURE", () => {
    expectIssue("NO_MINIMUM_DISCLOSURE", LEGACY_POLICY_BUNDLE);
  });

  it("reports NO_CREDIBILITY_CHECK", () => {
    expectIssue("NO_CREDIBILITY_CHECK", LEGACY_POLICY_BUNDLE);
  });

  it("reports NO_LIFE_THREAT_CHECK", () => {
    expectIssue("NO_LIFE_THREAT_CHECK", LEGACY_POLICY_BUNDLE);
  });

  it("returns no issues for a clean non-emergency bundle", () => {
    expect(analyzePolicyBundle(bundle([rule({ appliesToTools: ["read_patient_record"], conditions: [{ id: "condition.role", fact: "actor.role", operator: "EQUALS", value: "hospital_staff", label: "Staff" }] })]))).toEqual([]);
  });
});
