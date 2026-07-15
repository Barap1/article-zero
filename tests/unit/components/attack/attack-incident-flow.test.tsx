import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { HERO_ATTACK_SCENARIO } from "../../../../src/hospital/fixtures/scenarios";
import { createInMemoryHospitalTools } from "../../../../src/hospital/in-memory-tools";
import { runAttack } from "../../../../src/red-team/run-attack";
import { createSeedWorkspace } from "../../../../src/workspace/create-seed-workspace";
import { useWorkspaceStore } from "../../../../src/workspace/workspace-store";

vi.mock("../../../../src/hooks/use-run-attack", () => ({
  useRunAttack: () => ({ isLoading: false, state: { status: "idle" }, submit: vi.fn() }),
}));

import { AttackArena } from "../../../../src/components/article-zero/attack/attack-arena";
import { IncidentWorkspace } from "../../../../src/components/article-zero/attack/incident-workspace";

afterEach(cleanup);

it("keeps request controls on Attack and moves the selected result to Incident", async () => {
  const workspace = createSeedWorkspace();
  const legacy = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  if (legacy === undefined) throw new Error("Seed active version missing.");
  const run = await runAttack({ scenario: HERO_ATTACK_SCENARIO, bundle: legacy.policyBundle, constitutionVersionId: legacy.id, gateway: createInMemoryHospitalTools(), now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "attack-incident" });

  render(<AttackArena version={legacy} onAddAttackRun={vi.fn()} onAdvanceToAmendment={vi.fn()} onViewIncident={vi.fn()} />);
  expect(screen.getByLabelText("Request text")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Decision trace" })).toBeNull();

  cleanup();
  render(<IncidentWorkspace version={legacy} run={run} onAmend={vi.fn()} />);
  expect(screen.getByRole("heading", { name: "Incident" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Decision trace" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Create amendment" })).toBeTruthy();
  expect(screen.queryByLabelText("Request text")).toBeNull();
  expect(screen.queryByRole("button", { name: /Run protected action/i })).toBeNull();
});

it("creates an amendment workspace without changing the original clause", async () => {
  const workspace = createSeedWorkspace();
  const legacy = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  if (legacy === undefined) throw new Error("Seed active version missing.");
  const run = await runAttack({ scenario: HERO_ATTACK_SCENARIO, bundle: legacy.policyBundle, constitutionVersionId: legacy.id, gateway: createInMemoryHospitalTools(), now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "amendment-navigation" });
  const before = workspace.versions.find((version) => version.id === workspace.draftVersionId)?.clauses.find((clause) => clause.id === "clause.emergency-response")?.text;
  useWorkspaceStore.setState({ workspace: { ...workspace, attackRuns: [run], selectedAttackRunId: run.id }, hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });

  render(<IncidentWorkspace version={legacy} run={run} onAmend={() => useWorkspaceStore.getState().setDemoStage("AMENDMENT")} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Create amendment" }));

  expect(useWorkspaceStore.getState().workspace.demoStage).toBe("AMENDMENT");
  expect(useWorkspaceStore.getState().workspace.versions.find((version) => version.id === workspace.draftVersionId)?.clauses.find((clause) => clause.id === "clause.emergency-response")?.text).toBe(before);
});
