"use client";

import { PolicyConditionSchema, type PolicyCondition, type PolicyFieldChange, type PolicyStructuralDiff } from "../../../domain/schemas";
import { formatDisplayLabel } from "../../../lib/display-label";

type PolicyDiffProps = { readonly diff: PolicyStructuralDiff };

function scalarValue(value: unknown): string {
  if (value === null) return "Unknown";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.includes(" ") ? value : formatDisplayLabel(value);
  return String(value);
}

function machineIdentifier(value: string): boolean {
  return value.length > 24 && /^[a-zA-Z0-9._:-]+$/.test(value);
}

function ScalarValue({ value }: { readonly value: unknown }) {
  const text = scalarValue(value);
  return <span className={machineIdentifier(text) ? "az-policy-value-text az-policy-machine-value" : "az-policy-value-text"}>{text}</span>;
}

function ArrayValue({ value }: { readonly value: readonly unknown[] }) {
  return value.length === 0
    ? <span className="az-policy-value-text">None</span>
    : <ul className="az-policy-value-list">{value.map((entry, index) => <li className="az-policy-value-chip" key={`${scalarValue(entry)}-${index}`}><ScalarValue value={entry} /></li>)}</ul>;
}

function conditionRows(value: unknown): readonly PolicyCondition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const parsed = PolicyConditionSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

function ConditionsValue({ value }: { readonly value: unknown }) {
  const conditions = conditionRows(value);
  if (conditions.length === 0) return <span className="az-policy-value-text">None</span>;
  return <ul className="az-policy-condition-list">{conditions.map((condition) => <li className="az-policy-condition" key={condition.id}>
    <div><span className="az-policy-value-label">Fact</span><span className="az-policy-machine-value">{condition.fact}</span></div>
    <div><span className="az-policy-value-label">Operator</span><ScalarValue value={condition.operator} /></div>
    <div><span className="az-policy-value-label">Expected value</span>{Array.isArray(condition.value) ? <ArrayValue value={condition.value} /> : <ScalarValue value={condition.value} />}</div>
    <div><span className="az-policy-value-label">Label</span><span className="az-policy-value-text">{condition.label}</span></div>
  </li>)}</ul>;
}

function StructuredValue({ field, value }: { readonly field: PolicyFieldChange["field"]; readonly value: unknown }) {
  if (field === "conditions") return <ConditionsValue value={value} />;
  if (Array.isArray(value)) return <ArrayValue value={value} />;
  return <ScalarValue value={value} />;
}

function rawValue(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? String(value);
}

function FieldChange({ change }: { readonly change: PolicyFieldChange }) {
  return <li className="az-policy-field-change">
    <h5>{formatDisplayLabel(change.field)}</h5>
    <div className="az-policy-field-values">
      <div className="az-policy-field-value az-policy-before"><span className="az-policy-value-label">Before</span><StructuredValue field={change.field} value={change.before} /></div>
      <div className="az-policy-field-value az-policy-after"><span className="az-policy-value-label">After</span><StructuredValue field={change.field} value={change.after} /></div>
    </div>
    <details className="az-policy-raw-value"><summary>Technical raw values</summary><pre>{`Before\n${rawValue(change.before)}\n\nAfter\n${rawValue(change.after)}`}</pre></details>
  </li>;
}

export function PolicyDiff({ diff }: PolicyDiffProps) {
  return <div className="az-policy-diff" aria-label="Structured policy diff">
    {diff.addedRules.length > 0 ? <section><h3>Added rules</h3><ul>{diff.addedRules.map((rule) => <li key={rule.id}>{rule.name}</li>)}</ul></section> : null}
    {diff.removedRules.length > 0 ? <section><h3>Removed rules</h3><ul>{diff.removedRules.map((rule) => <li key={rule.id}>{rule.name}</li>)}</ul></section> : null}
    {diff.changedRules.length > 0 ? <section><h3>Changed rules</h3>{diff.changedRules.map((rule) => <div className="az-policy-changed-rule" key={rule.ruleId}><h4>{formatDisplayLabel(rule.ruleId)}</h4><ul className="az-policy-field-changes">{rule.changes.map((change) => <FieldChange key={change.field} change={change} />)}</ul></div>)}</section> : null}
    {diff.addedRules.length === 0 && diff.removedRules.length === 0 && diff.changedRules.length === 0 ? <p>No structural changes.</p> : null}
  </div>;
}
