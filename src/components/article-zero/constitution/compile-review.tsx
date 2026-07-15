"use client";

import type { CompilePreview } from "../../../domain/schemas";
import { PolicyDiff } from "../policy/policy-diff";

type CompileReviewProps = {
  readonly preview: CompilePreview;
  readonly source: "groq" | "fallback" | "deterministic";
  readonly isAccepting: boolean;
  readonly onAccept: () => void;
  readonly onReject: () => void;
};

function sourceLabel(source: CompileReviewProps["source"]): string {
  if (source === "groq") return "Groq";
  if (source === "fallback") return "Limited sample fallback";
  return "Deterministic source";
}

export function CompileReview({ preview, source, isAccepting, onAccept, onReject }: CompileReviewProps) {
  return <section className="az-review-card" aria-labelledby="compile-review-title">
    <div className="az-section-heading"><div><p className="az-eyebrow">Compiled policy proposal</p><h2 id="compile-review-title">Review before applying</h2></div><span className="az-source-badge">{sourceLabel(source)}</span></div>
    <p>{preview.result.interpretationSummary}</p>
    <PolicyDiff diff={preview.diff} />
    {preview.analysisIssues.length > 0 ? <p className="az-warning-copy">{preview.analysisIssues.length} analyzer finding{preview.analysisIssues.length === 1 ? "" : "s"} will carry into review.</p> : null}
    <div className="az-inline-actions"><button className="az-button az-button-primary" type="button" onClick={onAccept} disabled={isAccepting}>Accept compiled policy</button><button className="az-button az-button-quiet" type="button" onClick={onReject} disabled={isAccepting}>Reject proposal</button></div>
  </section>;
}
