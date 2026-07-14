"use client";

import { assessActivation } from "../../../activation";
import type { ConstitutionVersion, PolicyIssue, WorkspaceState } from "../../../domain/schemas";

type ActivationPanelProps = {
  readonly draft: ConstitutionVersion;
  readonly workspace: WorkspaceState;
  readonly issues: readonly PolicyIssue[];
  readonly onRun: (draft: ConstitutionVersion) => Promise<void>;
  readonly onActivate: () => Promise<void>;
  readonly onAcknowledge: (issueId: string) => void;
};

function latestTestRun(workspace: WorkspaceState, draftVersionId: string) {
  return [...workspace.testRuns].reverse().find((run) => run.constitutionVersionId === draftVersionId) ?? null;
}

export function ActivationPanel({ draft, workspace, issues, onRun, onActivate, onAcknowledge }: ActivationPanelProps) {
  const testRun = latestTestRun(workspace, draft.id);
  const assessment = assessActivation({ draft, issues, latestTestRun: testRun });
  const warnings = assessment.warningIssues;

  return <section className="az-activation-panel" aria-labelledby="activation-panel-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Deterministic test gate</p><h1 id="activation-panel-title">Activate the amended constitution</h1><p className="az-panel-lede">The policy engine runs the seeded suite. This panel only presents the resulting gate.</p></div><span className={assessment.canActivate ? "az-status-chip" : "az-status-chip az-status-dirty"}>{assessment.canActivate ? "Ready to activate" : "Activation blocked"}</span></div>
    <section className="az-activation-card" aria-labelledby="regression-suite-title">
      <div className="az-section-heading"><div><p className="az-eyebrow">Regression suite</p><h2 id="regression-suite-title">3 core tests</h2></div><button className="az-button az-button-primary" type="button" onClick={() => { void onRun(draft); }}>Run regression suite</button></div>
      {testRun === null ? <p className="az-help-text">No test run for this exact bundle hash yet.</p> : <ul className="az-test-results" aria-label="Regression results">{testRun.results.map((result) => <li key={result.testCaseId} className={result.passed ? "az-test-pass" : "az-test-fail"}><strong>{result.passed ? "Pass" : "Fail"}</strong><span>{result.testCaseId}</span><small>{result.actualOutcome} · {result.actualPermittedFields.length} field{result.actualPermittedFields.length === 1 ? "" : "s"}</small></li>)}</ul>}
    </section>
    <section className="az-activation-card" aria-labelledby="warnings-title">
      <div className="az-section-heading"><div><p className="az-eyebrow">Risk acknowledgement</p><h2 id="warnings-title">Warnings require a recorded decision</h2></div></div>
      {warnings.length === 0 ? <p className="az-success-copy">No warnings require acknowledgment for this bundle.</p> : <ul className="az-warning-list">{warnings.map((warning) => {
        const acknowledged = draft.acknowledgedIssueIds.includes(warning.id);
        return <li key={warning.id}><div><strong>{warning.title}</strong><p>{warning.detail}</p></div><button className="az-button az-button-secondary" type="button" onClick={() => onAcknowledge(warning.id)} disabled={acknowledged}>{acknowledged ? "Acknowledged" : "Acknowledge warning"}</button></li>;
      })}</ul>}
    </section>
    <section className="az-activation-card" aria-live="polite">
      <p className="az-eyebrow">Activation decision</p>
      <p>{assessment.canActivate ? "The current test run, bundle hash, and issue acknowledgments satisfy the activation gate." : `Blocked by: ${assessment.blockingReasonCodes.join(", ")}.`}</p>
      <button className="az-button az-button-primary" type="button" disabled={!assessment.canActivate} onClick={() => { void onActivate(); }}>Activate constitution</button>
    </section>
  </section>;
}
