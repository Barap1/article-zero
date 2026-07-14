import type { PolicyBundle, PolicyIssue, PolicyRule, PolicyStructuralDiff } from "../domain/schemas";
import { analyzePolicyBundle } from "../policy-engine/analyze-policy-bundle";
import { diffPolicyRules } from "../policy-engine/policy-diff";

export type StructuredPolicyPreview = {
  readonly proposedBundle: PolicyBundle;
  readonly diff: PolicyStructuralDiff;
  readonly analysisIssues: readonly PolicyIssue[];
};

export function previewStructuredRuleChange(bundle: PolicyBundle, revisedRule: PolicyRule): StructuredPolicyPreview {
  const rules = bundle.rules.map((rule) => rule.id === revisedRule.id ? revisedRule : rule);
  const proposedBundle = { ...bundle, rules };
  return { proposedBundle, diff: diffPolicyRules(bundle.rules, rules), analysisIssues: analyzePolicyBundle(proposedBundle) };
}
