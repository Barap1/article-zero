"use client";

import { assessActivation, SEEDED_REGRESSION_CASES } from "../../../activation";
import type { ConstitutionVersion, PolicyIssue, WorkspaceState } from "../../../domain/schemas";

type ActivationPanelProps = {
  readonly draft: ConstitutionVersion;
  readonly workspace: WorkspaceState;
  readonly issues: readonly PolicyIssue[];
  readonly onRun: (draft: ConstitutionVersion) => Promise<void>;
  readonly onActivate: () => Promise<void>;
  readonly onAcknowledge: (issueId: string) => void;
  readonly isRunning?: boolean;
  readonly isActivating?: boolean;
};

function outcomeLabel(outcome: ConstitutionVersion["policyBundle"]["rules"][number]["effect"]): string {
  if (outcome === "DENY") return "Blocked";
  if (outcome === "ALLOW") return "Allowed";
  if (outcome === "ALLOW_WITH_FIELD_FILTER") return "Allowed with field filter";
  return "Needs human approval";
}

function blockingReason(code: string): string {
  if (code === "SCHEMA_INVALID") return "The draft does not match the policy schema. Restore a valid structured policy before activating.";
  if (code === "POLICY_ISSUES") return "Resolve the critical or high-severity policy findings listed below.";
  if (code === "NO_TEST_RUN") return "Run the regression suite for this exact draft bundle.";
  if (code === "STALE_TEST_RUN") return "The draft changed after testing. Run the regression suite again.";
  if (code === "TEST_FAILURES") return "Fix the failing critical or high-severity tests, then run the suite again.";
  return "Acknowledge every warning before activation.";
}

function latestTestRun(workspace: WorkspaceState, draftVersionId: string) {
  return [...workspace.testRuns].reverse().find((run) => run.constitutionVersionId === draftVersionId) ?? null;
}

export function ActivationPanel({ draft, workspace, issues, onRun, onActivate, onAcknowledge, isRunning = false, isActivating = false }: ActivationPanelProps) {
  const testRun = latestTestRun(workspace, draft.id);
  const assessment = assessActivation({ draft, issues, latestTestRun: testRun });
  const warnings = assessment.warningIssues;

  return <section className="az-activation-panel" aria-labelledby="activation-panel-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Deterministic test gate</p><h1 id="activation-panel-title">Activate the amended constitution</h1><p className="az-panel-lede">The policy engine runs the seeded suite. This panel only presents the resulting gate.</p></div><span className={assessment.canActivate ? "az-status-chip" : "az-status-chip az-status-dirty"}>{assessment.canActivate ? "Ready to activate" : "Activation blocked"}</span></div>
    <section className="az-activation-card" aria-labelledby="regression-suite-title">
      <div className="az-section-heading"><div><p className="az-eyebrow">Regression suite</p><h2 id="regression-suite-title">{SEEDED_REGRESSION_CASES.length} named policy tests</h2></div><button className="az-button az-button-primary" type="button" onClick={() => { void onRun(draft); }} disabled={isRunning}>{isRunning ? "Running tests…" : "Run regression suite"}</button></div>
      <p className="az-help-text">Bundle freshness: {testRun === null ? "Not tested yet" : testRun.bundleHash === draft.bundleHash ? `Current bundle tested · ${draft.bundleHash.slice(0, 12)}` : "Stale test run · this draft needs a fresh run"}.</p>
      {testRun === null ? <p className="az-help-text">No result exists for this exact bundle hash yet.</p> : <ul className="az-test-results" aria-label="Regression results">{testRun.results.map((result) => { const testCase = SEEDED_REGRESSION_CASES.find((candidate) => candidate.id === result.testCaseId); return <li key={result.testCaseId} className={result.passed ? "az-test-pass" : "az-test-fail"}><strong>{result.passed ? "Pass" : "Fail"}</strong><span>{testCase?.name ?? "Named policy test"}</span><small>{outcomeLabel(result.actualOutcome)} · {result.actualPermittedFields.length} permitted field{result.actualPermittedFields.length === 1 ? "" : "s"}</small>{!result.passed && result.failureDetail ? <p className="az-error-copy">{result.failureDetail}</p> : null}</li>; })}</ul>}
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
      <p>{assessment.canActivate ? "The current test run, bundle hash, and issue acknowledgments satisfy the activation gate." : "Activation is blocked until the following actions are complete:"}</p>
      {!assessment.canActivate ? <ul className="az-warning-list">{assessment.blockingReasonCodes.map((code) => <li key={code}><span>{blockingReason(code)}</span></li>)}</ul> : null}
      {assessment.blockingIssues.length > 0 ? <ul className="az-warning-list">{assessment.blockingIssues.map((issue) => <li key={issue.id}><span><strong>{issue.title}</strong><br />{issue.suggestedResolution}</span></li>)}</ul> : null}
      <button className="az-button az-button-primary" type="button" disabled={!assessment.canActivate || isActivating} onClick={() => { void onActivate(); }}>{isActivating ? "Activating…" : "Activate constitution"}</button>
    </section>
  </section>;
}
