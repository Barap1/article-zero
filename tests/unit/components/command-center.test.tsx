import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";

import { runRegressionSuite } from "../../../src/activation/run-regression-suite";
import { SEEDED_REGRESSION_CASES } from "../../../src/activation/seeded-regression-cases";
import { ArticleZeroCommandCenter } from "../../../src/components/article-zero/article-zero-command-center";
import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { useWorkspaceStore } from "../../../src/workspace/workspace-store";

afterEach(cleanup);

it("opens the constitution from the fresh briefing", () => {
  useWorkspaceStore.setState({ workspace: createSeedWorkspace(), hasHydrated: true, isHydrating: false, showBriefing: true, errorMessage: null });

  render(createElement(ArticleZeroCommandCenter));
  fireEvent.click(screen.getByRole("button", { name: "Open the policy workspace" }));

  expect(useWorkspaceStore.getState().workspace.demoStage).toBe("CONSTITUTION");
  expect(screen.getByRole("heading", { name: "Constitution workspace" })).toBeTruthy();
});

it("lets keyboard users move between demo stages", () => {
  useWorkspaceStore.setState({ workspace: createSeedWorkspace(), hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });

  render(createElement(ArticleZeroCommandCenter));
  const attackStage = screen.getAllByRole("tab", { name: /Attack/ }).find((element) => element.id === "stage-attack");
  if (attackStage === undefined) throw new Error("Attack stage tab missing.");
  expect(screen.getAllByRole("tab", { name: /attack/i })).toHaveLength(1);
  fireEvent.keyDown(attackStage, { key: "Enter" });

  expect(useWorkspaceStore.getState().workspace.demoStage).toBe("ATTACK");
});

it("opens the affected amendment directly from a failed blocking test", async () => {
  const workspace = createSeedWorkspace();
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  const legacy = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  if (draft === undefined || legacy === undefined) throw new Error("The seeded versions are required for this test.");
  const testRun = await runRegressionSuite({ version: legacy, cases: SEEDED_REGRESSION_CASES, now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "command-center" });
  useWorkspaceStore.setState({ workspace: { ...workspace, demoStage: "TESTING", testRuns: [{ ...testRun, constitutionVersionId: draft.id, bundleHash: draft.bundleHash }] }, hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });

  render(createElement(ArticleZeroCommandCenter));
  fireEvent.click(screen.getAllByRole("button", { name: "Review suggested repair" })[0] as HTMLElement);

  expect(useWorkspaceStore.getState().workspace.demoStage).toBe("AMENDMENT");
  expect(useWorkspaceStore.getState().workspace.selectedClauseId).toBe("clause.emergency-response");
  expect(useWorkspaceStore.getState().activeRemediation?.testCaseId).toBe("attack.fake-responder-full-record");
  expect(screen.getAllByText("Fake responder full record")).toHaveLength(2);
});
