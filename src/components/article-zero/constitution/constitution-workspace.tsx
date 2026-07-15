"use client";

import { useEffect, useState } from "react";

import type { CompileOperationResult } from "../../../hooks/use-compile-clause";
import { useCompileClause } from "../../../hooks/use-compile-clause";
import { analyzePolicyBundle } from "../../../policy-engine/analyze-policy-bundle";
import { useWorkspaceStore } from "../../../workspace/workspace-store";
import { ClauseList } from "./clause-list";
import { CompileReview } from "./compile-review";

export function ConstitutionWorkspace() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const selectClause = useWorkspaceStore((state) => state.selectClause);
  const editClause = useWorkspaceStore((state) => state.editClause);
  const editClauseTitle = useWorkspaceStore((state) => state.editClauseTitle);
  const addClause = useWorkspaceStore((state) => state.addClause);
  const setProviderStatus = useWorkspaceStore((state) => state.setProviderStatus);
  const acceptCompilePreview = useWorkspaceStore((state) => state.acceptCompilePreview);
  const { submit, isLoading, state } = useCompileClause();
  const [reviews, setReviews] = useState<readonly CompileOperationResult[]>([]);
  const [isAccepting, setIsAccepting] = useState(false);
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  const active = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  useEffect(() => {
    if (state.status === "error") setProviderStatus("error");
  }, [setProviderStatus, state.status]);
  if (!draft || !active) return null;
  const clause = draft.clauses.find((entry) => entry.id === workspace.selectedClauseId) ?? draft.clauses[0];
  if (!clause) return null;
  const baselineClause = active.clauses.find((entry) => entry.id === clause.id);
  const issueCount = analyzePolicyBundle(draft.policyBundle).length;
  const clauseIssues = analyzePolicyBundle(draft.policyBundle).filter((issue) => issue.relatedClauseIds.includes(clause.id));
  const hasCriticalFinding = clauseIssues.some((issue) => issue.severity === "critical" || issue.severity === "high");
  const clauseIndex = draft.clauses.findIndex((entry) => entry.id === clause.id);
  const previousClause = clauseIndex > 0 ? draft.clauses[clauseIndex - 1] : undefined;
  const nextClause = clauseIndex >= 0 ? draft.clauses[clauseIndex + 1] : undefined;

  const compile = async (target = clause): Promise<void> => {
    const next = await submit({ clause: target, existingBundle: draft.policyBundle });
    if (next) {
      setProviderStatus(next.source === "groq" ? "live" : "fallback");
      setReviews((current) => [...current.filter((review) => review.preview.result.sourceClauseId !== target.id), next]);
    }
  };
  const compileAllChanged = async (): Promise<void> => {
    for (const changedClause of draft.clauses.filter((entry) => entry.status === "dirty" && entry.text.trim().length > 0)) await compile(changedClause);
  };
  const accept = async (review: CompileOperationResult): Promise<void> => {
    setIsAccepting(true);
    try { await acceptCompilePreview(review.preview.result.sourceClauseId, review.preview); setReviews((current) => current.filter((entry) => entry !== review)); } finally { setIsAccepting(false); }
  };
  const selectAndFocus = (clauseId: string): void => {
    selectClause(clauseId);
    window.requestAnimationFrame(() => document.getElementById("clause-title")?.focus());
  };
  const continueToReview = (): void => {
    document.getElementById("compiled-policy-review")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  return <section className="az-constitution-workspace" aria-labelledby="constitution-workspace-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Human policy</p><h1 id="constitution-workspace-title">Constitution workspace</h1><p className="az-panel-lede">Edit the draft clause, then review the compiler’s typed proposal before it changes the enforceable policy.</p></div><a className="az-button az-button-secondary" href="#compiled-policy-review">Review compiled policy</a></div>
    <div className="az-authoring-grid">
      <ClauseList clauses={draft.clauses} selectedClauseId={clause.id} onSelect={selectClause} onAdd={addClause} />
      <section className="az-clause-editor" aria-labelledby="clause-editor-title">
        <div className="az-section-heading"><div><p className="az-eyebrow">Draft article {clause.articleNumber}</p><h2 id="clause-editor-title">{clause.title}</h2></div><span className={`az-status-chip az-status-${clause.status}`}>{clause.status === "dirty" ? "Draft changed" : clause.status === "compiled" ? "Compiled" : "Clean"}</span></div>
        {hasCriticalFinding ? <p className="az-unsafe-callout"><strong>Policy finding.</strong> This article has a high-severity finding in the current structured bundle. Review the proposal before activation.</p> : null}
        <label className="az-field-label" htmlFor="clause-title">Clause title<input id="clause-title" value={clause.title} maxLength={160} onChange={(event) => editClauseTitle(clause.id, event.target.value)} /></label>
        <label className="az-field-label" htmlFor="clause-editor">Clause text</label>
        <textarea id="clause-editor" value={clause.text} maxLength={2000} onChange={(event) => editClause(clause.id, event.target.value)} aria-describedby="clause-character-count" />
        <p id="clause-character-count" className="az-help-text">{clause.text.length}/2,000 characters · {clause.lastCompiledText ? "Last compiled text available" : "Not compiled in this draft"}</p>
        <a className="az-help-text" href="#policy-findings">Static analysis: {issueCount} open finding{issueCount === 1 ? "" : "s"}. Review structured findings.</a>
        <div className="az-inline-actions"><button className="az-button az-button-primary" type="button" onClick={() => { void compile(); }} disabled={isLoading || clause.text.trim().length === 0}>{isLoading ? "Compiling…" : "Compile clause"}</button><button className="az-button az-button-quiet" type="button" onClick={() => { void compileAllChanged(); }} disabled={isLoading || !draft.clauses.some((entry) => entry.status === "dirty" && entry.text.trim().length > 0)}>Compile all changed</button>{baselineClause ? <button className="az-button az-button-quiet" type="button" onClick={() => editClause(clause.id, baselineClause.text)}>Restore active text</button> : null}</div>
        {state.status === "error" ? <p role="alert" className="az-error-copy">{state.error.message}</p> : null}
        <div className="az-clause-navigation" aria-label="Article navigation"><button className="az-button az-button-secondary" type="button" disabled={previousClause === undefined} onClick={() => { if (previousClause) selectAndFocus(previousClause.id); }}>Previous article</button><button className="az-button az-button-primary" type="button" onClick={() => { if (nextClause) selectAndFocus(nextClause.id); else continueToReview(); }}>{nextClause ? "Next article" : "Review structured policy"}</button></div>
      </section>
    </div>
    {reviews.map((review) => <CompileReview key={review.preview.result.sourceClauseId} preview={review.preview} source={review.source} isAccepting={isAccepting} onAccept={() => { void accept(review); }} onReject={() => setReviews((current) => current.filter((entry) => entry !== review))} />)}
  </section>;
}
