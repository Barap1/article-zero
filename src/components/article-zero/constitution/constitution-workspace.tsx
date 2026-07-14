"use client";

import { useState } from "react";

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
  const addClause = useWorkspaceStore((state) => state.addClause);
  const acceptCompilePreview = useWorkspaceStore((state) => state.acceptCompilePreview);
  const { submit, isLoading, state } = useCompileClause();
  const [reviews, setReviews] = useState<readonly CompileOperationResult[]>([]);
  const [isAccepting, setIsAccepting] = useState(false);
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  const active = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  if (!draft || !active) return null;
  const clause = draft.clauses.find((entry) => entry.id === workspace.selectedClauseId) ?? draft.clauses[0];
  if (!clause) return null;
  const baselineClause = active.clauses.find((entry) => entry.id === clause.id);
  const issueCount = analyzePolicyBundle(draft.policyBundle).length;

  const compile = async (target = clause): Promise<void> => {
    const next = await submit({ clause: target, existingBundle: draft.policyBundle });
    if (next) setReviews((current) => [...current.filter((review) => review.preview.result.sourceClauseId !== target.id), next]);
  };
  const compileAllChanged = async (): Promise<void> => {
    for (const changedClause of draft.clauses.filter((entry) => entry.status === "dirty" && entry.text.trim().length > 0)) await compile(changedClause);
  };
  const accept = async (review: CompileOperationResult): Promise<void> => {
    setIsAccepting(true);
    try { await acceptCompilePreview(review.preview.result.sourceClauseId, review.preview); setReviews((current) => current.filter((entry) => entry !== review)); } finally { setIsAccepting(false); }
  };

  return <section className="az-constitution-workspace" aria-labelledby="constitution-workspace-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Human policy</p><h1 id="constitution-workspace-title">Constitution workspace</h1><p className="az-panel-lede">Edit the draft clause, then review the compiler’s typed proposal before it changes the enforceable policy.</p></div><a className="az-button az-button-secondary" href="#compiled-policy-review">Review compiled policy</a></div>
    <div className="az-authoring-grid">
      <ClauseList clauses={draft.clauses} selectedClauseId={clause.id} onSelect={selectClause} onAdd={addClause} />
      <section className="az-clause-editor" aria-labelledby="clause-editor-title">
        <div className="az-section-heading"><div><p className="az-eyebrow">Draft article {clause.articleNumber}</p><h2 id="clause-editor-title">{clause.title}</h2></div><span className={`az-status-chip az-status-${clause.status}`}>{clause.status === "dirty" ? "Draft changed" : clause.status}</span></div>
        {clause.id === "clause.emergency-response" ? <p className="az-unsafe-callout"><strong>Legacy unsafe baseline.</strong> This clause permits an unverified responder path and full-record disclosure.</p> : null}
        <label className="az-field-label" htmlFor="clause-editor">Clause text</label>
        <textarea id="clause-editor" value={clause.text} maxLength={2000} onChange={(event) => editClause(clause.id, event.target.value)} aria-describedby="clause-character-count" />
        <p id="clause-character-count" className="az-help-text">{clause.text.length}/2,000 characters · {clause.lastCompiledText ? "Last compiled text available" : "Not compiled in this draft"}</p>
        <a className="az-help-text" href="#policy-findings">Static analysis: {issueCount} open finding{issueCount === 1 ? "" : "s"}. Review structured findings.</a>
        <div className="az-inline-actions"><button className="az-button az-button-primary" type="button" onClick={() => { void compile(); }} disabled={isLoading || clause.text.trim().length === 0}>{isLoading ? "Compiling…" : "Compile clause"}</button><button className="az-button az-button-quiet" type="button" onClick={() => { void compileAllChanged(); }} disabled={isLoading || !draft.clauses.some((entry) => entry.status === "dirty" && entry.text.trim().length > 0)}>Compile all changed</button>{baselineClause ? <button className="az-button az-button-quiet" type="button" onClick={() => editClause(clause.id, baselineClause.text)}>Restore active text</button> : null}</div>
        {state.status === "error" ? <p role="alert" className="az-error-copy">{state.error.message}</p> : null}
      </section>
    </div>
    {reviews.map((review) => <CompileReview key={review.preview.result.sourceClauseId} preview={review.preview} source={review.source} isAccepting={isAccepting} onAccept={() => { void accept(review); }} onReject={() => setReviews((current) => current.filter((entry) => entry !== review))} />)}
  </section>;
}
