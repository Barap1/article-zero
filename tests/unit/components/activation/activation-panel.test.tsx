import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { ActivationPanel } from "../../../../src/components/article-zero/activation/activation-panel";
import { analyzePolicyBundle } from "../../../../src/policy-engine/analyze-policy-bundle";
import { createSeedWorkspace } from "../../../../src/workspace/create-seed-workspace";

afterEach(cleanup);

it("runs the real regression callback and only enables activation after its result", async () => {
  const workspace = createSeedWorkspace();
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  if (draft === undefined) throw new Error("The draft is required for this test.");
  const run = vi.fn(async () => undefined);

  render(<ActivationPanel draft={draft} workspace={workspace} issues={analyzePolicyBundle(draft.policyBundle)} onRun={run} onActivate={async () => undefined} onAcknowledge={() => undefined} />);

  await userEvent.setup().click(screen.getByRole("button", { name: /run regression suite/i }));

  expect(run).toHaveBeenCalledWith(draft);
  expect(screen.getByRole("button", { name: /activate constitution/i }).hasAttribute("disabled")).toBe(true);
});
