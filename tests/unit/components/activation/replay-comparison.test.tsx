import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { HERO_ATTACK_SCENARIO } from "../../../../src/hospital/fixtures/scenarios";
import { createInMemoryHospitalTools } from "../../../../src/hospital/in-memory-tools";
import { runAttack } from "../../../../src/red-team/run-attack";
import { createSeedWorkspace } from "../../../../src/workspace/create-seed-workspace";

const { submit } = vi.hoisted(() => ({ submit: vi.fn() }));

vi.mock("../../../../src/hooks/use-run-attack", () => ({
  useRunAttack: () => ({ isLoading: false, state: { status: "idle" }, submit }),
}));

import { ReplayComparison } from "../../../../src/components/article-zero/activation/replay-comparison";

afterEach(() => {
  cleanup();
  submit.mockReset();
});

it("requires the fake replay before enabling the verified control and never invents a test count", async () => {
  const workspace = createSeedWorkspace();
  const legacy = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  if (legacy === undefined || draft === undefined) throw new Error("Seed versions missing.");
  const legacyAttack = await runAttack({ scenario: HERO_ATTACK_SCENARIO, bundle: legacy.policyBundle, constitutionVersionId: legacy.id, gateway: createInMemoryHospitalTools(), now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "replay-test" });
  submit.mockResolvedValue({ action: legacyAttack.action, source: "frozen_replay", decision: legacyAttack.decision, toolResult: legacyAttack.toolResult, auditEvents: [] });

  render(<ReplayComparison activeVersion={draft} legacyAttack={legacyAttack} onAddAttackRun={vi.fn()} onAddAuditEvents={vi.fn()} onComplete={vi.fn()} />);

  const fakeButton = screen.getByRole("button", { name: "Replay exact frozen attack" });
  const legitimateButton = screen.getByRole("button", { name: "Run verified responder control" });
  expect(fakeButton.hasAttribute("disabled")).toBe(false);
  expect(legitimateButton.hasAttribute("disabled")).toBe(true);
  expect(screen.queryByText(/3\/3/)).toBeNull();

  await userEvent.setup().click(fakeButton);
  expect(screen.getByRole("button", { name: "Run verified responder control" }).hasAttribute("disabled")).toBe(false);
  expect(screen.getByText(/Required controls produced: 1 of 2/)).toBeTruthy();
});

it("guards replay entry copy when the legacy request is missing", () => {
  const workspace = createSeedWorkspace();
  const active = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  if (active === undefined) throw new Error("Seed active version missing.");

  render(<ReplayComparison activeVersion={active} legacyAttack={undefined} onAddAttackRun={vi.fn()} onAddAuditEvents={vi.fn()} onComplete={vi.fn()} />);

  expect(screen.getByText(/Run the legacy fake-responder request in Attack before replaying it/i)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Replay exact frozen attack" }).hasAttribute("disabled")).toBe(true);
});
