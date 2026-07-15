import type { WorkspaceState } from "../domain/schemas";

export const WORKFLOW_STAGES: readonly WorkspaceState["demoStage"][] = ["CONSTITUTION", "ATTACK", "INCIDENT", "AMENDMENT", "TESTING", "REPLAY", "COMPLETE"];

export type StageAvailability = {
  readonly available: boolean;
  readonly complete: boolean;
  readonly reason: string | null;
};

export type WorkflowAvailability = Record<WorkspaceState["demoStage"], StageAvailability>;

function hasCompiledDraft(workspace: WorkspaceState): boolean {
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  if (draft === undefined) return false;
  return draft.changeSummary !== "Editable child of the legacy baseline."
    && draft.changeSummary !== "Seeded legacy unsafe baseline."
    || draft.clauses.some((clause) => clause.status === "compiled");
}

function hasFreshTestRun(workspace: WorkspaceState): boolean {
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  if (draft === undefined) return false;
  return [...workspace.testRuns].reverse().some((run) => run.constitutionVersionId === draft.id && run.bundleHash === draft.bundleHash);
}

function hasRunForScenario(workspace: WorkspaceState, scenarioId: string, versionId: string): boolean {
  return workspace.attackRuns.some((run) => run.scenarioId === scenarioId && run.constitutionVersionId === versionId);
}

export function getWorkflowAvailability(workspace: WorkspaceState): WorkflowAvailability {
  const active = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  const selectedRun = workspace.attackRuns.find((run) => run.id === workspace.selectedAttackRunId);
  const hasAttack = workspace.attackRuns.length > 0;
  const hasAmendment = hasCompiledDraft(workspace);
  const hasTests = hasFreshTestRun(workspace);
  const hasTestHistory = workspace.testRuns.length > 0;
  const hasLegacyAttack = active !== undefined
    && workspace.attackRuns.some((run) => run.scenarioId === "scenario.fake-responder-full-record" && run.constitutionVersionId !== active.id);
  const hasFakeReplay = active !== undefined && hasRunForScenario(workspace, "scenario.fake-responder-full-record", active.id);
  const hasLegitimateReplay = active !== undefined && hasRunForScenario(workspace, "scenario.verified-responder-minimum-record", active.id);
  const replayComplete = active?.status === "ACTIVE" && hasLegacyAttack && hasFakeReplay && hasLegitimateReplay;

  return {
    CONSTITUTION: { available: true, complete: hasAmendment || hasAttack, reason: null },
    ATTACK: { available: active !== undefined, complete: hasAttack, reason: active === undefined ? "Create an active policy version first." : null },
    INCIDENT: { available: selectedRun !== undefined, complete: selectedRun !== undefined, reason: selectedRun === undefined ? "Run a synthetic request in Attack first." : null },
    AMENDMENT: { available: selectedRun !== undefined, complete: hasAmendment, reason: selectedRun === undefined ? "Run a request, then open its incident." : null },
    TESTING: { available: hasAmendment || hasTestHistory, complete: hasTests || hasTestHistory, reason: hasAmendment || hasTestHistory ? null : "Compile an edited draft before testing." },
    REPLAY: { available: active?.status === "ACTIVE" && hasLegacyAttack, complete: replayComplete, reason: active?.status !== "ACTIVE" || !hasLegacyAttack ? "Activate a tested version before replay." : null },
    COMPLETE: { available: replayComplete, complete: replayComplete, reason: replayComplete ? null : "Run both required replay controls first." },
  };
}
