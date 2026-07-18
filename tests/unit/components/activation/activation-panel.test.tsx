import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { runRegressionSuite } from "../../../../src/activation/run-regression-suite";
import { SEEDED_REGRESSION_CASES } from "../../../../src/activation/seeded-regression-cases";
import { ActivationPanel } from "../../../../src/components/article-zero/activation/activation-panel";
import type { RegressionTestResult } from "../../../../src/domain/schemas";
import { analyzePolicyBundle } from "../../../../src/policy-engine/analyze-policy-bundle";
import { createSeedWorkspace } from "../../../../src/workspace/create-seed-workspace";

afterEach(cleanup);

it("runs the real regression callback and only enables activation after its result", async () => {
  const workspace = createSeedWorkspace();
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  if (draft === undefined) throw new Error("The draft is required for this test.");
  const run = vi.fn(async () => undefined);

  render(<ActivationPanel draft={draft} workspace={workspace} issues={analyzePolicyBundle(draft.policyBundle)} onRun={run} onActivate={async () => undefined} onAcknowledge={() => undefined} onReviewRepair={vi.fn()} />);

  await userEvent.setup().click(screen.getByRole("button", { name: /run regression suite/i }));

  expect(run).toHaveBeenCalledWith(draft);
  expect(screen.getByRole("button", { name: /activate constitution/i }).hasAttribute("disabled")).toBe(true);
});

it("sorts blocking failures before warnings and passes and sends the failed test repair context", async () => {
  const workspace = createSeedWorkspace();
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  const legacy = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  if (draft === undefined || legacy === undefined) throw new Error("The seeded versions are required for this test.");
  const sourceRun = await runRegressionSuite({ version: legacy, cases: SEEDED_REGRESSION_CASES, now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "panel-sort" });
  const results: RegressionTestResult[] = sourceRun.results.map((result, index) => ({ ...result, passed: index === 3, severity: index === 2 ? "warning" : result.severity }));
  const onReviewRepair = vi.fn();
  const testWorkspace = { ...workspace, testRuns: [{ ...sourceRun, constitutionVersionId: draft.id, bundleHash: draft.bundleHash, results }] };

  render(<ActivationPanel draft={draft} workspace={testWorkspace} issues={analyzePolicyBundle(draft.policyBundle)} onRun={async () => undefined} onActivate={async () => undefined} onAcknowledge={() => undefined} onReviewRepair={onReviewRepair} />);

  const list = screen.getByRole("list", { name: "Regression results" });
  const items = within(list).getAllByRole("listitem");
  expect(items[0]?.textContent).toContain("Fake responder full record");
  expect(items[1]?.textContent).toContain("Verified responder minimum disclosure");
  expect(items[2]?.textContent).toContain("Noncredible responder request");
  expect(items[3]?.textContent).toContain("Trusted emergency credential outage");

  await userEvent.setup().click(within(items[0] as HTMLElement).getByRole("button", { name: "Review suggested repair" }));

  expect(onReviewRepair).toHaveBeenCalledWith(expect.objectContaining({ testCaseId: "attack.fake-responder-full-record" }));
});
