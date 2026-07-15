import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { runRegressionSuite, SEEDED_REGRESSION_CASES } from "../../../src/activation";
import { HERO_ATTACK_SCENARIO, LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO } from "../../../src/hospital/fixtures/scenarios";
import { createInMemoryHospitalTools } from "../../../src/hospital/in-memory-tools";
import { runAttack } from "../../../src/red-team/run-attack";
import { CompletionSummary } from "../../../src/components/article-zero/completion-summary";
import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { useWorkspaceStore } from "../../../src/workspace/workspace-store";

afterEach(cleanup);

it("shows the active version, produced outcomes, latest tests, and recovery actions", async () => {
  const seed = createSeedWorkspace();
  const legacy = seed.versions.find((version) => version.id === seed.activeVersionId);
  const draft = seed.versions.find((version) => version.id === seed.draftVersionId);
  if (legacy === undefined || draft === undefined) throw new Error("Seed versions missing.");
  const active = { ...draft, status: "ACTIVE" as const, activatedAt: "2026-07-13T12:00:00.000Z", changeSummary: "Require verified minimum emergency disclosure." };
  const fakeRun = await runAttack({ scenario: HERO_ATTACK_SCENARIO, bundle: active.policyBundle, constitutionVersionId: active.id, gateway: createInMemoryHospitalTools(), now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "completion-fake" });
  const legitimateRun = await runAttack({ scenario: LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO, bundle: active.policyBundle, constitutionVersionId: active.id, gateway: createInMemoryHospitalTools(), now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "completion-legitimate" });
  const testRun = await runRegressionSuite({ version: active, cases: SEEDED_REGRESSION_CASES, now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "completion-test" });
  useWorkspaceStore.setState({ workspace: { ...seed, activeVersionId: active.id, versions: [{ ...legacy, status: "ARCHIVED" as const }, active], attackRuns: [fakeRun, legitimateRun], testRuns: [testRun], demoStage: "COMPLETE" }, hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });

  render(<CompletionSummary onOpenAudit={vi.fn()} onExport={vi.fn()} onReturnHome={vi.fn()} onStartAnotherSimulation={vi.fn()} isExporting={false} />);

  expect(screen.getByRole("heading", { name: "Workflow complete" })).toBeTruthy();
  expect(screen.getByText(active.label)).toBeTruthy();
  expect(screen.getByText("Require verified minimum emergency disclosure.")).toBeTruthy();
  expect(screen.getByText("Fake responder")).toBeTruthy();
  expect(screen.getByText("Legitimate responder")).toBeTruthy();
  expect(screen.getByText("Blocked")).toBeTruthy();
  expect(screen.getByText("Allowed with field filter")).toBeTruthy();
  expect(screen.getByText(/4\/4 tests passed/i)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Return home" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Start another simulation" })).toBeTruthy();
});
