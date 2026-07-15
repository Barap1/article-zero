"use client";

import { SEEDED_REGRESSION_CASES } from "../../activation";
import type { AttackRun, WorkspaceState } from "../../domain/schemas";
import { useWorkspaceStore } from "../../workspace/workspace-store";

type CompletionSummaryProps = {
  readonly onOpenAudit: () => void;
  readonly onExport: () => void;
  readonly onReturnHome: () => void;
  readonly onStartAnotherSimulation: () => void;
  readonly isExporting: boolean;
};

function outcomeLabel(run: AttackRun | undefined): string {
  if (run === undefined) return "Not produced yet";
  if (run.decision.outcome === "DENY") return "Blocked";
  if (run.decision.outcome === "ALLOW") return "Allowed";
  if (run.decision.outcome === "ALLOW_WITH_FIELD_FILTER") return "Allowed with field filter";
  return "Needs human approval";
}

function latestTestRun(workspace: WorkspaceState, versionId: string, activationTestRunId: string | null) {
  return workspace.testRuns.find((run) => run.id === activationTestRunId)
    ?? [...workspace.testRuns].reverse().find((run) => run.constitutionVersionId === versionId)
    ?? null;
}

export function CompletionSummary({ onOpenAudit, onExport, onReturnHome, onStartAnotherSimulation, isExporting }: CompletionSummaryProps) {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const active = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  if (active === undefined) return <section className="az-stage-panel"><p role="alert" className="az-error-copy">The active version is unavailable.</p></section>;

  const testRun = latestTestRun(workspace, active.id, active.activationTestRunId);
  const fakeRun = [...workspace.attackRuns].reverse().find((run) => run.scenarioId === "scenario.fake-responder-full-record" && run.constitutionVersionId === active.id);
  const legitimateRun = [...workspace.attackRuns].reverse().find((run) => run.scenarioId === "scenario.verified-responder-minimum-record" && run.constitutionVersionId === active.id);
  const passedTests = testRun?.results.filter((result) => result.passed).length ?? 0;

  return <section className="az-completion-summary" aria-labelledby="completion-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Enforced result</p><h1 id="completion-title">Workflow complete</h1><p className="az-panel-lede">The amended policy is active, its tests are recorded, and the same synthetic requests have been checked against the new version.</p></div><span className="az-status-chip">Active</span></div>
    <div className="az-completion-grid">
      <section className="az-review-card"><p className="az-eyebrow">Active version</p><h2>{active.label}</h2><p>{active.bundleHash}</p><p className="az-help-text">{active.changeSummary}</p></section>
      <section className="az-review-card"><p className="az-eyebrow">Latest tests</p><h2>{testRun === null ? "No tests produced" : `${passedTests}/${testRun.results.length} tests passed`}</h2>{testRun !== null ? <ul className="az-test-results">{testRun.results.map((result) => <li key={result.testCaseId} className={result.passed ? "az-test-pass" : "az-test-fail"}><strong>{result.passed ? "Pass" : "Fail"}</strong><span>{SEEDED_REGRESSION_CASES.find((testCase) => testCase.id === result.testCaseId)?.name ?? "Named policy test"}</span><small>{result.failureDetail ?? "Expected behavior observed."}</small></li>)}</ul> : <p className="az-help-text">Run the deterministic suite before activating a version.</p>}</section>
      <section className="az-review-card"><p className="az-eyebrow">Replay outcomes</p><h2>Same request, new boundary</h2><dl className="az-completion-outcomes"><div><dt>Fake responder</dt><dd>{outcomeLabel(fakeRun)}</dd></div><div><dt>Legitimate responder</dt><dd>{outcomeLabel(legitimateRun)}</dd></div><div><dt>Allowed emergency fields</dt><dd>{legitimateRun?.decision.permittedFields.length ?? 0}</dd></div></dl></section>
    </div>
    <div className="az-completion-actions"><button className="az-button az-button-secondary" type="button" onClick={onOpenAudit}>Audit timeline</button><button className="az-button az-button-secondary" type="button" onClick={onExport} disabled={isExporting}>{isExporting ? "Preparing export…" : "Export audit package"}</button><button className="az-button az-button-quiet" type="button" onClick={onReturnHome}>Return home</button><button className="az-button az-button-primary" type="button" onClick={onStartAnotherSimulation}>Start another simulation</button></div>
  </section>;
}
