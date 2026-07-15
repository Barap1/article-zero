"use client";

import { useEffect, useState } from "react";

import type { PolicyRule } from "../../../domain/schemas";
import { useRevisePolicy } from "../../../hooks/use-revise-policy";
import { previewStructuredRuleChange } from "../../../workspace/policy-preview";
import { useWorkspaceStore } from "../../../workspace/workspace-store";
import { PolicyDiff } from "./policy-diff";
import { PolicyGraph } from "./policy-graph";
import { PolicyIssues } from "./policy-issues";
import { PolicyRuleEditor } from "./policy-rule-editor";

type PendingStructuredChange = ReturnType<typeof previewStructuredRuleChange>;

export function PolicyReview() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const selectClause = useWorkspaceStore((state) => state.selectClause);
  const acceptPolicyBundle = useWorkspaceStore((state) => state.acceptPolicyBundle);
  const acceptRevisionPreview = useWorkspaceStore((state) => state.acceptRevisionPreview);
  const setProviderStatus = useWorkspaceStore((state) => state.setProviderStatus);
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [ruleDraft, setRuleDraft] = useState<PolicyRule | null>(null);
  const [selectedRevisionRuleIds, setSelectedRevisionRuleIds] = useState<readonly string[]>([]);
  const [instruction, setInstruction] = useState("Require verified identity and disclose only emergency fields.");
  const [structuredPreview, setStructuredPreview] = useState<PendingStructuredChange | null>(null);
  const [revisionPreview, setRevisionPreview] = useState<Awaited<ReturnType<ReturnType<typeof useRevisePolicy>["submit"]>>>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const revision = useRevisePolicy();
  const issues = draft ? previewStructuredRuleChange(draft.policyBundle, draft.policyBundle.rules[0] ?? nullRule()).analysisIssues : [];

  useEffect(() => {
    if (revision.state.status === "error") setProviderStatus("error");
  }, [revision.state.status, setProviderStatus]);

  useEffect(() => {
    if (!draft) return;
    const rule = draft.policyBundle.rules.find((entry) => entry.id === selectedRuleId) ?? draft.policyBundle.rules[0];
    if (!rule) return;
    setSelectedRuleId(rule.id);
    setRuleDraft(rule);
    setSelectedRevisionRuleIds((selected) => selected.length > 0 ? selected.filter((id) => draft.policyBundle.rules.some((entry) => entry.id === id)) : [rule.id]);
  }, [draft, selectedRuleId]);
  if (!draft || !ruleDraft) return null;

  const focusRule = (ruleId: string): void => {
    const rule = draft.policyBundle.rules.find((entry) => entry.id === ruleId);
    if (!rule) return;
    setSelectedRuleId(rule.id);
    window.requestAnimationFrame(() => document.getElementById(`policy-rule-${rule.id}`)?.focus());
  };
  const focusClause = (clauseId: string): void => {
    selectClause(clauseId);
    window.requestAnimationFrame(() => document.getElementById("clause-editor")?.focus());
  };
  const toggleRevisionRule = (ruleId: string): void => setSelectedRevisionRuleIds((selected) => selected.includes(ruleId) ? selected.filter((id) => id !== ruleId) : [...selected, ruleId]);
  const previewRevision = async (): Promise<void> => {
    const selectedRules = draft.policyBundle.rules.filter((rule) => selectedRevisionRuleIds.includes(rule.id));
    if (selectedRules.length === 0 || instruction.trim().length === 0) return;
    const next = await revision.submit({ instruction, selectedRuleIds: selectedRules.map((rule) => rule.id), selectedRules, existingBundle: draft.policyBundle });
    if (next) {
      setProviderStatus(next.source === "groq" ? "live" : "fallback");
      setRevisionPreview(next);
    }
  };
  const acceptStructured = async (): Promise<void> => {
    if (!structuredPreview) return;
    setIsAccepting(true);
    try { await acceptPolicyBundle(structuredPreview.proposedBundle, "Accepted structured policy change."); setStructuredPreview(null); } finally { setIsAccepting(false); }
  };
  const acceptRevision = async (): Promise<void> => {
    if (!revisionPreview) return;
    setIsAccepting(true);
    try { await acceptRevisionPreview(revisionPreview.preview); setRevisionPreview(null); } finally { setIsAccepting(false); }
  };

  return <section className="az-compiled-policy-review" id="compiled-policy-review" aria-labelledby="compiled-policy-review-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Compiled policy</p><h1 id="compiled-policy-review-title">Structured policy review</h1><p className="az-panel-lede">Closed controls are the source of truth. Every change is previewed before it updates the draft bundle.</p></div><button className="az-button az-button-secondary" type="button" disabled title="Run activation tests before activating this draft.">Activate Constitution</button></div>
    <div className="az-policy-layout"><div className="az-policy-main"><div className="az-rule-selector" aria-label="Select a rule">{draft.policyBundle.rules.map((rule) => <button className={`az-rule-selector-item ${rule.id === selectedRuleId ? "az-rule-selector-item-selected" : ""}`} key={rule.id} type="button" onClick={() => focusRule(rule.id)}>{rule.name}</button>)}</div><PolicyRuleEditor rule={ruleDraft} rules={draft.policyBundle.rules} onChange={setRuleDraft} /><div className="az-inline-actions"><button className="az-button az-button-primary" type="button" onClick={() => setStructuredPreview(previewStructuredRuleChange(draft.policyBundle, ruleDraft))}>Review structured change</button><button className="az-button az-button-quiet" type="button" onClick={() => setRuleDraft(draft.policyBundle.rules.find((rule) => rule.id === selectedRuleId) ?? null)}>Discard local edits</button></div>{structuredPreview ? <section className="az-review-card" aria-labelledby="structured-preview-title"><h2 id="structured-preview-title">Structured change pending confirmation</h2><PolicyDiff diff={structuredPreview.diff} /><div className="az-inline-actions"><button className="az-button az-button-primary" type="button" disabled={isAccepting} onClick={() => { void acceptStructured(); }}>Accept structured change</button><button className="az-button az-button-quiet" type="button" onClick={() => setStructuredPreview(null)}>Reject structured change</button></div></section> : null}</div><PolicyIssues issues={issues} onSelectRule={focusRule} /></div>
    <section className="az-revision-card" aria-labelledby="revision-title"><div className="az-section-heading"><div><p className="az-eyebrow">Natural-language revision</p><h2 id="revision-title">Request a typed correction</h2></div>{revision.state.status === "success" ? <span className="az-source-badge">Preview ready</span> : null}</div><fieldset><legend>Rules to revise</legend><div className="az-checkbox-grid">{draft.policyBundle.rules.map((rule) => <label key={rule.id}><input type="checkbox" checked={selectedRevisionRuleIds.includes(rule.id)} onChange={() => toggleRevisionRule(rule.id)} />{rule.name}</label>)}</div></fieldset><label className="az-field-label" htmlFor="natural-language-correction">Natural-language correction</label><textarea id="natural-language-correction" value={instruction} onChange={(event) => setInstruction(event.target.value)} /><div className="az-inline-actions"><button className="az-button az-button-primary" type="button" disabled={revision.isLoading || selectedRevisionRuleIds.length === 0 || instruction.trim().length === 0} onClick={() => { void previewRevision(); }}>{revision.isLoading ? "Preparing revision…" : "Preview revision"}</button></div>{revision.state.status === "error" ? <p className="az-error-copy" role="alert">{revision.state.error.message}</p> : null}{revisionPreview ? <section className="az-review-card"><h3>Revision preview · {revisionPreview.source === "groq" ? "Live Groq" : "Limited sample fallback"}</h3><p>{revisionPreview.preview.result.changeSummary}</p><PolicyDiff diff={revisionPreview.preview.diff} /><div className="az-inline-actions"><button className="az-button az-button-primary" type="button" disabled={isAccepting} onClick={() => { void acceptRevision(); }}>Accept revision</button><button className="az-button az-button-quiet" type="button" onClick={() => setRevisionPreview(null)}>Reject revision</button></div></section> : null}</section>
    <details className="az-raw-json"><summary>Read-only policy JSON</summary><pre tabIndex={0} aria-label="Read-only compiled policy JSON">{JSON.stringify(draft.policyBundle, null, 2)}</pre></details>
    <PolicyGraph clauses={draft.clauses} rules={draft.policyBundle.rules} issues={issues} onSelectClause={focusClause} onSelectRule={focusRule} />
  </section>;
}

function nullRule(): PolicyRule {
  return { id: "empty-rule", sourceClauseId: "", name: "No rule", description: "", priority: 1, appliesToTools: [], conditionMode: "ALL", conditions: [], effect: "DENY", allowedFields: [], onIndeterminate: "DENY", overridesRuleIds: [], severity: "informational", enabled: false };
}
