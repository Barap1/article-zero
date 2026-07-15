"use client";

import { useEffect, useState } from "react";

import type { CompileOperationResult } from "../../hooks/use-compile-clause";
import { useCompileClause } from "../../hooks/use-compile-clause";
import { useWorkspaceStore } from "../../workspace/workspace-store";
import { CompileReview } from "./constitution/compile-review";

export const SAMPLE_EMERGENCY_REPAIR = "During a credible and imminent threat to life, disclose only the minimum necessary emergency information to a verified emergency responder. If required facts cannot be verified, request approval from a hospital privacy officer; otherwise deny access.";

type AmendmentWorkspaceProps = {
  readonly onContinueTesting: () => void;
};

export function AmendmentWorkspace({ onContinueTesting }: AmendmentWorkspaceProps) {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const editClause = useWorkspaceStore((state) => state.editClause);
  const acceptCompilePreview = useWorkspaceStore((state) => state.acceptCompilePreview);
  const setProviderStatus = useWorkspaceStore((state) => state.setProviderStatus);
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  const active = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  const clause = draft?.clauses.find((entry) => entry.id === workspace.selectedClauseId);
  const originalClause = active?.clauses.find((entry) => entry.id === clause?.id);
  const compile = useCompileClause();
  const [review, setReview] = useState<CompileOperationResult | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (compile.state.status === "error") setProviderStatus("error");
  }, [compile.state.status, setProviderStatus]);

  if (draft === undefined || active === undefined || clause === undefined) return <section className="az-stage-panel"><p role="alert" className="az-error-copy">The amendment target is unavailable. Return to the policy workspace and select an article.</p></section>;

  const compileClause = async (): Promise<void> => {
    const next = await compile.submit({ clause, existingBundle: draft.policyBundle });
    if (next !== null) {
      setProviderStatus(next.source === "groq" ? "live" : "fallback");
      setReview(next);
    }
  };

  const accept = async (): Promise<void> => {
    if (review === null) return;
    setIsAccepting(true);
    try {
      await acceptCompilePreview(review.preview.result.sourceClauseId, review.preview);
      setReview(null);
    } finally {
      setIsAccepting(false);
    }
  };

  const canContinue = clause.status === "compiled" || draft.changeSummary !== "Editable child of the legacy baseline.";

  return <section className="az-amendment-workspace" aria-labelledby="amendment-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Human policy</p><h1 id="amendment-title">Create an amendment</h1><p className="az-panel-lede">The original clause stays unchanged until you edit the proposed text and accept a compiled policy preview.</p></div><span className="az-status-chip">Draft amendment</span></div>
    <div className="az-amendment-grid">
      <section className="az-review-card" aria-labelledby="original-clause-title"><p className="az-eyebrow">Original text</p><h2 id="original-clause-title">{originalClause?.title ?? clause.title}</h2><p className="az-amendment-original">{originalClause?.text ?? "No original text is available for this clause."}</p></section>
      <section className="az-clause-editor" aria-labelledby="proposed-clause-title"><div className="az-section-heading"><div><p className="az-eyebrow">Proposed text</p><h2 id="proposed-clause-title">Edit the amendment</h2></div></div><label className="az-field-label" htmlFor="amendment-text">Proposed clause text<textarea id="amendment-text" value={clause.text} maxLength={2000} onChange={(event) => editClause(clause.id, event.target.value)} /></label><details className="az-suggestion-details" open><summary>Suggested repair</summary><div className="az-disclosure-body"><p className="az-help-text">Use this bounded sample repair as a starting point, then edit it before compiling.</p><button className="az-button az-button-secondary" type="button" onClick={() => editClause(clause.id, SAMPLE_EMERGENCY_REPAIR)}>Use suggested repair</button></div></details><div className="az-inline-actions"><button className="az-button az-button-primary" type="button" onClick={() => { void compileClause(); }} disabled={compile.isLoading || clause.text.trim().length === 0}>{compile.isLoading ? "Preparing preview…" : "Compile preview"}</button></div>{compile.state.status === "error" ? <p className="az-error-copy" role="alert">{compile.state.error.message}</p> : null}</section>
    </div>
    {review !== null ? <CompileReview preview={review.preview} source={review.source} isAccepting={isAccepting} onAccept={() => { void accept(); }} onReject={() => setReview(null)} /> : null}
    <div className="az-amendment-actions"><p className="az-help-text">{canContinue ? "The draft has a compiled change ready for the deterministic activation gate." : "Use the suggested repair or edit the clause, then compile and accept its preview before testing."}</p><button className="az-button az-button-primary" type="button" disabled={!canContinue} onClick={onContinueTesting}>Continue to testing</button></div>
  </section>;
}
