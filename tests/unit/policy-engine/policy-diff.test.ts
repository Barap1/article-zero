import { describe, expect, it } from "vitest";

import type { PolicyRule } from "../../../src/domain/schemas";
import { diffPolicyRules } from "../../../src/policy-engine/policy-diff";

const baseRule: PolicyRule = {
  id: "rule.base",
  sourceClauseId: "clause.test",
  name: "Base",
  description: "Base description",
  priority: 10,
  appliesToTools: ["read_patient_record"],
  conditionMode: "ALL",
  conditions: [],
  effect: "DENY",
  allowedFields: [],
  onIndeterminate: "DENY",
  overridesRuleIds: [],
  severity: "warning",
  enabled: true,
};

describe("diffPolicyRules", () => {
  it("reports added, removed, unchanged, and every changed rule field", () => {
    const changed: PolicyRule = {
      ...baseRule,
      name: "Changed",
      description: "Changed description",
      priority: 20,
      appliesToTools: ["disclose_patient_data"],
      conditions: [{ id: "condition.changed", fact: "actor.role", operator: "EQUALS", value: "hospital_staff", label: "Staff" }],
      effect: "ALLOW_WITH_FIELD_FILTER",
      allowedFields: ["fullName"],
      onIndeterminate: "REQUIRE_HUMAN_APPROVAL",
      overridesRuleIds: ["rule.removed"],
      severity: "critical",
      enabled: false,
    };
    const added: PolicyRule = { ...baseRule, id: "rule.added" };
    const removed: PolicyRule = { ...baseRule, id: "rule.removed" };
    const diff = diffPolicyRules([baseRule, removed], [changed, added]);

    expect(diff.addedRules.map((rule) => rule.id)).toEqual(["rule.added"]);
    expect(diff.removedRules.map((rule) => rule.id)).toEqual(["rule.removed"]);
    expect(diff.unchangedRuleIds).toEqual([]);
    expect(diff.changedRules[0]?.changes.map((change) => change.field)).toEqual([
      "name", "description", "priority", "appliesToTools", "conditions", "effect", "allowedFields", "onIndeterminate", "overridesRuleIds", "severity", "enabled",
    ]);
  });
});
