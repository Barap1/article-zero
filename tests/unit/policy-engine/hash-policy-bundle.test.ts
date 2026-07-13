import { describe, expect, it } from "vitest";

import type { PolicyBundle } from "../../../src/domain/schemas";
import { CORRECTED_POLICY_BUNDLE } from "../../../src/hospital/fixtures/constitution";
import { hashPolicyBundle } from "../../../src/policy-engine/hash-policy-bundle";

describe("hashPolicyBundle", () => {
  it("canonicalizes rule, condition, and semantically unordered array order", async () => {
    const reordered: PolicyBundle = {
      ...CORRECTED_POLICY_BUNDLE,
      versionLabel: "A different label",
      rules: [...CORRECTED_POLICY_BUNDLE.rules].reverse().map((rule) => ({
        ...rule,
        appliesToTools: rule.appliesToTools.toReversed(),
        allowedFields: rule.allowedFields.toReversed(),
        overridesRuleIds: rule.overridesRuleIds.toReversed(),
        conditions: rule.conditions.toReversed(),
      })),
    };

    await expect(hashPolicyBundle(reordered)).resolves.toBe(await hashPolicyBundle(CORRECTED_POLICY_BUNDLE));
  });

  it("changes when a condition value changes", async () => {
    const changed: PolicyBundle = {
      ...CORRECTED_POLICY_BUNDLE,
      rules: CORRECTED_POLICY_BUNDLE.rules.map((rule, index) => index === 0
        ? { ...rule, conditions: rule.conditions.map((condition, conditionIndex) => conditionIndex === 0 ? { ...condition, value: false } : condition) }
        : rule),
    };

    await expect(hashPolicyBundle(changed)).resolves.not.toBe(await hashPolicyBundle(CORRECTED_POLICY_BUNDLE));
  });
});
