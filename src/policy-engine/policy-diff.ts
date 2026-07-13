import type { PolicyFieldChange, PolicyRule, PolicyRuleChange, PolicyStructuralDiff } from "../domain/schemas";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return [...value].map(stableValue).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, stableValue(entry)]));
  }
  return value;
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

const fields = ["name", "description", "priority", "appliesToTools", "conditions", "effect", "allowedFields", "onIndeterminate", "overridesRuleIds", "severity", "enabled"] as const;

export function diffPolicyRules(before: PolicyRule[], after: PolicyRule[]): PolicyStructuralDiff {
  const beforeById = new Map(before.map((rule) => [rule.id, rule]));
  const afterById = new Map(after.map((rule) => [rule.id, rule]));
  const addedRules = after.filter((rule) => !beforeById.has(rule.id));
  const removedRules = before.filter((rule) => !afterById.has(rule.id));
  const changedRules: PolicyRuleChange[] = [];
  const unchangedRuleIds: string[] = [];

  for (const afterRule of after) {
    const beforeRule = beforeById.get(afterRule.id);
    if (beforeRule === undefined) continue;
    const changes: PolicyFieldChange[] = [];
    for (const field of fields) {
      if (!equal(beforeRule[field], afterRule[field])) changes.push({ field, before: beforeRule[field], after: afterRule[field], summary: `${field} changed.` });
    }
    if (changes.length === 0) unchangedRuleIds.push(afterRule.id);
    else changedRules.push({ ruleId: afterRule.id, changes });
  }

  return { addedRules, removedRules, changedRules, unchangedRuleIds };
}
