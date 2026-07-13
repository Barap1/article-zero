import type { PolicyRule } from "../domain/schemas";

export function formatPolicyRule(rule: PolicyRule): string {
  const conditions = rule.conditions.length === 0 ? "always" : rule.conditions.map((condition) => condition.label).join("; ");
  const fields = rule.effect === "ALLOW_WITH_FIELD_FILTER" ? ` Fields: ${rule.allowedFields.join(", ")}.` : "";

  return `${rule.name} (${rule.id}) applies to ${rule.appliesToTools.join(", ")} at priority ${rule.priority}: ${conditions}. Outcome: ${rule.effect}.${fields}`;
}
