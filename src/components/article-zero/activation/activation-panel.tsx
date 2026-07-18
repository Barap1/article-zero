"use client";

import { assessActivation, SEEDED_REGRESSION_CASES } from "../../../activation";
import { deriveRegressionRemediation, type RegressionRemediation } from "../../../activation/regression-remediation";
import type { ConstitutionVersion, PolicyIssue, RegressionTestResult, WorkspaceState } from "../../../domain/schemas";
import { RegressionResultCard } from "./regression-result-card";

type ActivationPanelProps = {
  readonly draft: ConstitutionVersion;
  readonly workspace: WorkspaceState;
  readonly issues: readonly PolicyIssue[];
  readonly onRun: (draft: ConstitutionVersion) => Promise<void>;
  readonly onActivate: () => Promise<void>;
  readonly onAcknowledge: (issueId: string) => void;
  readonly onReviewRepair: (remediation: RegressionRemediation) => void;
  readonly isRunning?: boolean;
  readonly isActivating?: boolean;
};

function blockingReason(code: string): string {
  if (code === "SCHEMA_INVALID") return "The draft does not match the policy schema. Restore a valid structured policy before activating.";
  if (code === "POLICY_ISSUES") return "Resolve the critical or high-severity policy findings listed below.";
  if (code === "NO_TEST_RUN") return "Run the regression suite for this exact draft bundle.";
  if (code === "STALE_TEST_RUN") return "The draft changed after testing. Run the regression suite again.";
  if (code === "TEST_FAILURES") return "Fix the failing critical or high-severity tests, then run the suite again.";
  return "Acknowledge every warning before activation.";
}

function resultRank(result: RegressionTestResult, blockingFailureIds: ReadonlySet<string>): number {
  if (!result.passed && blockingFailureIds.has(result.testCaseId)) return 0;
  if (!result.passed) return 1;
  return 2;
}

function latestTestRun(workspace: WorkspaceState, draftVersionId: string) {
  return [...workspace.testRuns].reverse().find((run) => run.constitutionVersionId === draftVersionId) ?? null;
}

export function ActivationPanel({ draft, workspace, issues, onRun, onActivate, onAcknowledge, onReviewRepair, isRunning = false, isActivating = false }: ActivationPanelProps) {
  const testRun = latestTestRun(workspace, draft.id);
  const assessment = assessActivation({ draft, issues, latestTestRun: testRun });
  const warnings = assessment.warningIssues;
  const blockingFailureIds = new Set(assessment.blockingTestFailures.map((result) => result.testCaseId));
  const results = testRun === null ? [] : [...testRun.results].sort((left, right) => resultRank(left, blockingFailureIds) - resultRank(right, blockingFailureIds));

  return <section className="az-activation-panel" aria-labelledby="activation-panel-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Deterministic test gate</p><h1 id="activation-panel-title">Activate the amended constitution</h1><p className="az-panel-lede">The policy engine runs the seeded suite. This panel only presents the resulting gate.</p></div><span className={assessment.canActivate ? "az-status-chip" : "az-status-chip az-status-dirty"}>{assessment.canActivate ? "Ready to activate" : "Activation blocked"}</span></div>
    <section className="az-activation-card" aria-labelledby="regression-suite-title">
      <div className="az-section-heading"><div><p className="az-eyebrow">Regression suite</p><h2 id="regression-suite-title">{SEEDED_REGRESSION_CASES.length} named policy tests</h2></div><button className="az-button az-button-primary" type="button" onClick={() => { void onRun(draft); }} disabled={isRunning}>{isRunning ? "Running tests…" : "Run regression suite"}</button></div>
      <p className="az-help-text">Bundle freshness: {testRun === null ? "Not tested yet" : testRun.bundleHash === draft.bundleHash ? `Current bundle tested · ${draft.bundleHash.slice(0, 12)}` : "Stale test run · this draft needs a fresh run"}.</p>
      {testRun === null ? <p className="az-help-text">No result exists for this exact bundle hash yet.</p> : <ul className="az-test-results" aria-label="Regression results">{results.map((result) => {
        const testCase = SEEDED_REGRESSION_CASES.find((candidate) => candidate.id === result.testCaseId);
        if (testCase === undefined) return null;
        const remediation = deriveRegressionRemediation({ version: draft, testCase, result });
        const repairProps = blockingFailureIds.has(result.testCaseId) && remediation !== null ? { onReviewRepair } : {};
        return <RegressionResultCard key={result.testCaseId} testCase={testCase} result={result} remediation={remediation} {...repairProps} />;
      })}</ul>}
    </section>
    <details className="az-activation-card az-activation-details">
      <summary>Review risk acknowledgements</summary>
      <div className="az-disclosure-body"><div className="az-section-heading"><div><p className="az-eyebrow">Risk acknowledgement</p><h2 id="warnings-title">Warnings require a recorded decision</h2></div></div>
      {warnings.length === 0 ? <p className="az-success-copy">No warnings require acknowledgment for this bundle.</p> : <ul className="az-warning-list">{warnings.map((warning) => {
        const acknowledged = draft.acknowledgedIssueIds.includes(warning.id);
        return <li key={warning.id}><div><strong>{warning.title}</strong><p>{warning.detail}</p></div><button className="az-button az-button-secondary" type="button" onClick={() => onAcknowledge(warning.id)} disabled={acknowledged}>{acknowledged ? "Acknowledged" : "Acknowledge warning"}</button></li>;
      })}</ul>}</div>
    </details>
    <section className="az-activation-card az-activation-decision" aria-live="polite">
      <p className="az-eyebrow">Activation decision</p>
      <h2>Ready when the evidence is current</h2>
      <p>{assessment.canActivate ? "The current test run, bundle hash, and issue acknowledgments satisfy the activation gate." : "Activation is blocked until the following actions are complete:"}</p>
      {!assessment.canActivate ? <ul className="az-warning-list">{assessment.blockingReasonCodes.map((code) => <li key={code}><span>{blockingReason(code)}</span></li>)}</ul> : null}
      {assessment.blockingIssues.length > 0 ? <ul className="az-warning-list">{assessment.blockingIssues.map((issue) => <li key={issue.id}><span><strong>{issue.title}</strong><br />{issue.suggestedResolution}</span></li>)}</ul> : null}
      <button className="az-button az-button-primary" type="button" disabled={!assessment.canActivate || isActivating} onClick={() => { void onActivate(); }}>{isActivating ? "Activating…" : "Activate constitution"}</button>
    </section>
  </section>;
}
