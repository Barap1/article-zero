"use client";

import type { PolicyFieldChange, PolicyStructuralDiff } from "../../../domain/schemas";
import { formatDisplayLabel } from "../../../lib/display-label";

type PolicyDiffProps = { readonly diff: PolicyStructuralDiff };

function fieldValue(value: unknown): string {
  return typeof value === "string" ? formatDisplayLabel(value) : JSON.stringify(value) ?? "Unknown";
}

function FieldChange({ change }: { readonly change: PolicyFieldChange }) {
  return <li><strong>{formatDisplayLabel(change.field)}</strong><span><del>{fieldValue(change.before)}</del><ins>{fieldValue(change.after)}</ins></span></li>;
}

export function PolicyDiff({ diff }: PolicyDiffProps) {
  return <div className="az-policy-diff" aria-label="Structured policy diff">
    {diff.addedRules.length > 0 ? <section><h3>Added rules</h3><ul>{diff.addedRules.map((rule) => <li key={rule.id}>{rule.name}</li>)}</ul></section> : null}
    {diff.removedRules.length > 0 ? <section><h3>Removed rules</h3><ul>{diff.removedRules.map((rule) => <li key={rule.id}>{rule.name}</li>)}</ul></section> : null}
    {diff.changedRules.length > 0 ? <section><h3>Changed rules</h3>{diff.changedRules.map((rule) => <div key={rule.ruleId}><h4>{formatDisplayLabel(rule.ruleId)}</h4><ul>{rule.changes.map((change) => <FieldChange key={change.field} change={change} />)}</ul></div>)}</section> : null}
    {diff.addedRules.length === 0 && diff.removedRules.length === 0 && diff.changedRules.length === 0 ? <p>No structural changes.</p> : null}
  </div>;
}
