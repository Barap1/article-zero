"use client";

import { ACTOR_ROLES, CONDITION_OPERATORS, FACT_KEYS, PATIENT_FIELDS, POLICY_EFFECTS, SEVERITIES, TOOL_NAMES } from "../../../domain/catalogs";
import type { ConditionExpectedValue, PolicyCondition, PolicyRule } from "../../../domain/schemas";
import { formatDisplayLabel } from "../../../lib/display-label";

type PolicyRuleEditorProps = {
  readonly rule: PolicyRule;
  readonly rules: readonly PolicyRule[];
  readonly onChange: (rule: PolicyRule) => void;
};

type SelectOption = { readonly value: string; readonly label: string };

const BOOLEAN_OPTIONS = ["true", "false", "null"].map((value) => ({ value, label: formatDisplayLabel(value) }));
const VALUE_OPTIONS: Record<(typeof FACT_KEYS)[number], readonly SelectOption[]> = {
  "actor.role": ACTOR_ROLES.map((value) => ({ value, label: formatDisplayLabel(value) })),
  "actor.identityVerified": BOOLEAN_OPTIONS,
  "actor.organizationVerified": BOOLEAN_OPTIONS,
  "emergency.credible": BOOLEAN_OPTIONS,
  "emergency.imminent": BOOLEAN_OPTIONS,
  "emergency.threatToLife": BOOLEAN_OPTIONS,
  "emergency.evidenceSource": ["self_claimed", "verified_dispatch", "hospital_system", "unavailable"].map((value) => ({ value, label: formatDisplayLabel(value) })),
  "patient.id": [{ value: "patient.elena-marquez", label: "Synthetic patient record" }],
  "request.purpose": ["treatment", "emergency_response", "operations", "privacy_review", "unknown"].map((value) => ({ value, label: formatDisplayLabel(value) })),
  "request.requestedFields": PATIENT_FIELDS.map((value) => ({ value, label: formatDisplayLabel(value) })),
  "approval.status": ["not_requested", "pending", "approved", "denied", "unknown"].map((value) => ({ value, label: formatDisplayLabel(value) })),
  "approval.approverRole": ACTOR_ROLES.map((value) => ({ value, label: formatDisplayLabel(value) })),
  "tool.name": TOOL_NAMES.map((value) => ({ value, label: formatDisplayLabel(value) })),
};

function conditionValue(value: string): ConditionExpectedValue {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  return value;
}

function optionValue(value: ConditionExpectedValue): string {
  return Array.isArray(value) ? value[0] ?? "" : String(value);
}

function hasMultipleValues(operator: PolicyCondition["operator"]): boolean {
  return operator === "IN" || operator === "CONTAINS_ANY" || operator === "CONTAINS_ALL";
}

function updateCondition(rule: PolicyRule, index: number, update: (condition: PolicyCondition) => PolicyCondition): PolicyRule {
  return { ...rule, conditions: rule.conditions.map((condition, conditionIndex) => conditionIndex === index ? update(condition) : condition) };
}

function toggle<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function catalogValue<T extends string>(values: readonly T[], value: string, fallback: T): T {
  return values.find((entry) => entry === value) ?? fallback;
}

function optionList(values: readonly string[]): readonly SelectOption[] {
  return values.map((value) => ({ value, label: formatDisplayLabel(value) }));
}

export function PolicyRuleEditor({ rule, rules, onChange }: PolicyRuleEditorProps) {
  return <section id={`policy-rule-${rule.id}`} className="az-rule-editor" tabIndex={-1} aria-labelledby="rule-editor-title">
    <div className="az-section-heading"><div><p className="az-eyebrow">Compiled policy</p><h2 id="rule-editor-title">Structured rule editor</h2></div><span className="az-status-chip">{rule.enabled ? "Enabled" : "Disabled"}</span></div>
    <p className="az-policy-sentence"><strong>{rule.name}</strong> applies to {rule.appliesToTools.map(formatDisplayLabel).join(", ") || "no protected tools"} at priority {rule.priority}. {rule.conditions.length === 0 ? "It always applies." : rule.conditions.map((condition) => condition.label).join("; ")} Outcome: {formatDisplayLabel(rule.effect)}.</p>

    <fieldset className="az-rule-basics-section">
      <legend>Basics</legend>
      <div className="az-rule-basics">
        <label>Name<input value={rule.name} onChange={(event) => onChange({ ...rule, name: event.target.value })} /></label>
        <label>Description<input value={rule.description} onChange={(event) => onChange({ ...rule, description: event.target.value })} /></label>
        <label>Priority<input type="number" min={1} max={100} value={rule.priority} onChange={(event) => onChange({ ...rule, priority: Number(event.target.value) })} /></label>
        <label>Effect<select value={rule.effect} onChange={(event) => onChange({ ...rule, effect: catalogValue(POLICY_EFFECTS, event.target.value, rule.effect) })}>{optionList(POLICY_EFFECTS).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
    </fieldset>

    <details className="az-policy-disclosure">
      <summary>Permissions &amp; fields</summary>
      <div className="az-disclosure-body">
        <fieldset><legend>Protected tools</legend><div className="az-checkbox-grid">{TOOL_NAMES.map((tool) => <label key={tool}><input type="checkbox" checked={rule.appliesToTools.includes(tool)} onChange={() => onChange({ ...rule, appliesToTools: toggle(rule.appliesToTools, tool) })} />{formatDisplayLabel(tool)}</label>)}</div></fieldset>
        <fieldset><legend>Allowed patient fields</legend><div className="az-checkbox-grid">{PATIENT_FIELDS.map((field) => <label key={field}><input type="checkbox" checked={rule.allowedFields.includes(field)} onChange={() => onChange({ ...rule, allowedFields: toggle(rule.allowedFields, field) })} />{formatDisplayLabel(field)}</label>)}</div></fieldset>
      </div>
    </details>

    <details className="az-policy-disclosure">
      <summary>Conditions</summary>
      <div className="az-disclosure-body">
        <fieldset>
          <legend>Rule conditions</legend>
          {rule.conditions.map((condition, index) => <div className="az-condition-row" key={condition.id}>
            <label>Condition {index + 1} fact
              <select aria-label={`Condition ${index + 1} fact`} value={condition.fact} onChange={(event) => {
                const fact = catalogValue(FACT_KEYS, event.target.value, condition.fact);
                onChange(updateCondition(rule, index, (current) => ({ ...current, fact, value: conditionValue(VALUE_OPTIONS[fact][0]?.value ?? ""), label: fact })));
              }}>{FACT_KEYS.map((fact) => <option key={fact} value={fact}>{formatDisplayLabel(fact)}</option>)}</select>
            </label>
            <label>Operator
              <select aria-label={`Condition ${index + 1} operator`} value={condition.operator} onChange={(event) => onChange(updateCondition(rule, index, (current) => ({ ...current, operator: catalogValue(CONDITION_OPERATORS, event.target.value, current.operator) })))}>{optionList(CONDITION_OPERATORS).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </label>
            <label>Expected value
              <select aria-label={`Condition ${index + 1} expected value`} multiple={hasMultipleValues(condition.operator)} value={hasMultipleValues(condition.operator) ? (Array.isArray(condition.value) ? condition.value : [optionValue(condition.value)]) : optionValue(condition.value)} onChange={(event) => onChange(updateCondition(rule, index, (current) => ({ ...current, value: hasMultipleValues(current.operator) ? Array.from(event.target.selectedOptions, (option) => option.value) : conditionValue(event.target.value) })))}>{VALUE_OPTIONS[condition.fact].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </label>
            <label>Explanation<input value={condition.label} onChange={(event) => onChange(updateCondition(rule, index, (current) => ({ ...current, label: event.target.value })))} /></label>
            <button className="az-button az-button-quiet" type="button" onClick={() => onChange({ ...rule, conditions: rule.conditions.filter((_, conditionIndex) => conditionIndex !== index) })}>Remove</button>
          </div>)}
          <button className="az-button az-button-quiet" type="button" onClick={() => onChange({ ...rule, conditions: [...rule.conditions, { id: `${rule.id}.condition.${rule.conditions.length + 1}`, fact: "actor.identityVerified", operator: "EQUALS", value: true, label: "Identity is verified" }] })}>Add condition</button>
        </fieldset>
      </div>
    </details>

    <details className="az-policy-disclosure">
      <summary>Advanced controls</summary>
      <div className="az-disclosure-body">
        <label className="az-enabled-toggle"><input checked={rule.enabled} type="checkbox" onChange={() => onChange({ ...rule, enabled: !rule.enabled })} />Enabled</label>
        <div className="az-rule-basics az-rule-advanced-grid">
          <label>Indeterminate fallback<select value={rule.onIndeterminate} onChange={(event) => onChange({ ...rule, onIndeterminate: catalogValue(["DENY", "REQUIRE_HUMAN_APPROVAL"], event.target.value, rule.onIndeterminate) })}>{optionList(["DENY", "REQUIRE_HUMAN_APPROVAL"]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Severity<select value={rule.severity} onChange={(event) => onChange({ ...rule, severity: catalogValue(SEVERITIES, event.target.value, rule.severity) })}>{optionList(SEVERITIES).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <fieldset><legend>Overrides</legend><div className="az-checkbox-grid">{rules.filter((candidate) => candidate.id !== rule.id).map((candidate) => <label key={candidate.id}><input type="checkbox" checked={rule.overridesRuleIds.includes(candidate.id)} onChange={() => onChange({ ...rule, overridesRuleIds: toggle(rule.overridesRuleIds, candidate.id) })} />{candidate.name}</label>)}</div></fieldset>
      </div>
    </details>
    <p className="az-help-text">Rule ID and source clause remain fixed traceability links. Condition mode is {formatDisplayLabel(rule.conditionMode)}.</p>
  </section>;
}
