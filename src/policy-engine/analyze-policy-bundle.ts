import {
  BREAK_GLASS_EMERGENCY_FIELDS,
  CONDITION_OPERATORS,
  FACT_KEYS,
  PATIENT_FIELDS,
  POLICY_EFFECTS,
  SEVERITIES,
  TOOL_NAMES,
} from "../domain/catalogs";
import type { PolicyBundle, PolicyIssue, PolicyRule } from "../domain/schemas";

const severityOrder = { critical: 0, high: 1, warning: 2, informational: 3 } as const;

function contains(values: readonly string[], value: unknown): boolean {
  return values.some((candidate) => candidate === value);
}

function hasCondition(rule: PolicyRule, fact: string, value: unknown): boolean {
  return rule.conditions.some((condition) => condition.fact === fact && condition.operator === "EQUALS" && condition.value === value);
}

function issue(code: string, severity: PolicyIssue["severity"], detail: string, rules: readonly PolicyRule[] = []): PolicyIssue {
  const relatedRuleIds = [...new Set(rules.map((rule) => rule.id))].sort();
  const relatedClauseIds = [...new Set(rules.map((rule) => rule.sourceClauseId))].sort();
  const relatedIds = [...relatedClauseIds, ...relatedRuleIds];
  return {
    id: `${code}:${relatedIds.join(",")}`,
    severity,
    code,
    title: code.replaceAll("_", " "),
    detail,
    relatedClauseIds,
    relatedRuleIds,
    suggestedResolution: "Review the affected policy rules.",
    acknowledged: false,
  };
}

function emergencyDisclosure(rule: PolicyRule): boolean {
  return rule.appliesToTools.includes("disclose_patient_data") && rule.conditions.some((condition) => condition.fact.startsWith("emergency."));
}

function compliantBreakGlass(rule: PolicyRule): boolean {
  return rule.effect === "ALLOW_WITH_FIELD_FILTER"
    && rule.allowedFields.every((field) => contains(BREAK_GLASS_EMERGENCY_FIELDS, field))
    && hasCondition(rule, "emergency.credible", true)
    && hasCondition(rule, "emergency.imminent", true)
    && hasCondition(rule, "emergency.threatToLife", true)
    && rule.conditions.some((condition) => condition.fact === "emergency.evidenceSource" && condition.operator === "IN" && Array.isArray(condition.value) && condition.value.includes("verified_dispatch") && condition.value.includes("hospital_system"))
    && rule.onIndeterminate === "REQUIRE_HUMAN_APPROVAL";
}

function breakGlassCandidate(rule: PolicyRule): boolean {
  return rule.effect === "ALLOW_WITH_FIELD_FILTER"
    && rule.appliesToTools.includes("disclose_patient_data")
    && (hasCondition(rule, "actor.identityVerified", null) || rule.conditions.some((condition) => condition.fact === "emergency.evidenceSource"));
}

function potentiallyOverlaps(left: PolicyRule, right: PolicyRule): boolean {
  if (!left.appliesToTools.some((tool) => right.appliesToTools.includes(tool))) return false;
  return !left.conditions.some((leftCondition) => right.conditions.some((rightCondition) => leftCondition.fact === rightCondition.fact && leftCondition.operator === "EQUALS" && rightCondition.operator === "EQUALS" && leftCondition.value !== rightCondition.value));
}

export function analyzePolicyBundle(bundle: PolicyBundle): PolicyIssue[] {
  const issues: PolicyIssue[] = [];
  const rules = bundle.rules;
  const add = (value: PolicyIssue): void => {
    issues.push(value);
  };

  for (const rule of rules) {
    if (!Number.isInteger(rule.priority) || rule.priority < 1 || rule.priority > 100) add(issue("INVALID_PRIORITY", "critical", `Rule ${rule.id} has priority ${String(rule.priority)}.`, [rule]));
    if (rule.effect === "ALLOW_WITH_FIELD_FILTER" && rule.allowedFields.length === 0) add(issue("FILTER_WITHOUT_FIELDS", "critical", `Rule ${rule.id} filters disclosure without allowing fields.`, [rule]));
    if ((rule.effect === "DENY" || rule.effect === "REQUIRE_HUMAN_APPROVAL") && rule.allowedFields.length > 0) add(issue("FIELDS_ON_NON_FILTER_EFFECT", "warning", `Rule ${rule.id} specifies fields for ${rule.effect}.`, [rule]));

    const conditionIds = new Set<string>();
    for (const condition of rule.conditions) {
      if (conditionIds.has(condition.id)) add(issue("DUPLICATE_CONDITION_ID", "high", `Rule ${rule.id} repeats condition ${condition.id}.`, [rule]));
      conditionIds.add(condition.id);
      if (!contains(FACT_KEYS, condition.fact) || !contains(CONDITION_OPERATORS, condition.operator)) add(issue("UNSUPPORTED_CATALOG_VALUE", "critical", `Rule ${rule.id} contains an unsupported condition catalog value.`, [rule]));
    }
    if (!rule.appliesToTools.every((tool) => contains(TOOL_NAMES, tool)) || !rule.allowedFields.every((field) => contains(PATIENT_FIELDS, field)) || !contains(POLICY_EFFECTS, rule.effect) || !contains(SEVERITIES, rule.severity)) add(issue("UNSUPPORTED_CATALOG_VALUE", "critical", `Rule ${rule.id} contains an unsupported policy catalog value.`, [rule]));
  }

  const rulesById = new Map<string, PolicyRule>();
  for (const rule of rules) {
    const existing = rulesById.get(rule.id);
    if (existing) add(issue("DUPLICATE_RULE_ID", "critical", `Rules share ID ${rule.id}.`, [existing, rule]));
    rulesById.set(rule.id, rule);
  }
  for (const rule of rules) {
    for (const targetId of rule.overridesRuleIds) {
      const target = rulesById.get(targetId);
      if (!target) add(issue("DANGLING_OVERRIDE", "high", `Rule ${rule.id} overrides missing rule ${targetId}.`, [rule]));
      else if (target.id === rule.id) add(issue("SELF_OVERRIDE", "critical", `Rule ${rule.id} overrides itself.`, [rule]));
      else if (target.priority > rule.priority) add(issue("LOWER_PRIORITY_OVERRIDE", "high", `Rule ${rule.id} cannot override higher-priority rule ${target.id}.`, [rule, target]));
    }
  }
  for (let leftIndex = 0; leftIndex < rules.length; leftIndex += 1) {
    const left = rules[leftIndex];
    if (left === undefined || !left.enabled) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < rules.length; rightIndex += 1) {
      const right = rules[rightIndex];
      if (right === undefined || !right.enabled || left.priority !== right.priority || !potentiallyOverlaps(left, right)) continue;
      if (left.effect !== right.effect) add(issue("EQUAL_PRIORITY_CONFLICT", "critical", `Rules ${left.id} and ${right.id} overlap at priority ${left.priority}.`, [left, right]));
    }
  }

  for (const rule of rules) {
    if (rule.appliesToTools.includes("disclose_patient_data") && rule.effect === "ALLOW" && rule.conditions.length === 0 && rules.some((candidate) => candidate.id !== rule.id && candidate.appliesToTools.includes("disclose_patient_data") && candidate.effect === "DENY")) add(issue("UNCONDITIONAL_PRIVACY_OVERRIDE", "critical", `Rule ${rule.id} unconditionally allows disclosure.`, [rule]));
    if (!emergencyDisclosure(rule)) continue;
    const breakGlass = compliantBreakGlass(rule);
    const breakGlassLike = breakGlassCandidate(rule);
    if ((rule.effect === "ALLOW" || rule.effect === "ALLOW_WITH_FIELD_FILTER") && !hasCondition(rule, "actor.identityVerified", true) && !breakGlassLike) add(issue("UNVERIFIED_EMERGENCY_OVERRIDE", "critical", `Emergency disclosure rule ${rule.id} lacks identity verification.`, [rule]));
    if (breakGlassLike && (!breakGlass || rule.allowedFields.some((field) => !contains(BREAK_GLASS_EMERGENCY_FIELDS, field)))) add(issue("BREAK_GLASS_TOO_BROAD", "critical", `Break-glass rule ${rule.id} is broader than the trusted emergency contract.`, [rule]));
    if (rule.effect === "ALLOW") add(issue("NO_MINIMUM_DISCLOSURE", "critical", `Emergency disclosure rule ${rule.id} allows the full requested record.`, [rule]));
    if (!hasCondition(rule, "emergency.credible", true)) add(issue("NO_CREDIBILITY_CHECK", "high", `Emergency rule ${rule.id} does not require credible evidence.`, [rule]));
    if (!hasCondition(rule, "emergency.threatToLife", true)) add(issue("NO_LIFE_THREAT_CHECK", "warning", `Emergency rule ${rule.id} does not require a threat-to-life check.`, [rule]));
  }

  return issues.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity] || left.code.localeCompare(right.code) || left.id.localeCompare(right.id));
}
