import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import type { RevisionPreview } from "../../../../src/domain/schemas";
import { CORRECTED_POLICY_BUNDLE } from "../../../../src/hospital/fixtures/constitution";
import { diffPolicyRules } from "../../../../src/policy-engine/policy-diff";
import { createSeedWorkspace } from "../../../../src/workspace/create-seed-workspace";
import { useWorkspaceStore } from "../../../../src/workspace/workspace-store";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const revisedBundle = { ...CORRECTED_POLICY_BUNDLE, rules: CORRECTED_POLICY_BUNDLE.rules.map((rule, index) => index === 0 ? { ...rule, priority: 91 } : rule) };

const revisionPreview: RevisionPreview = {
  result: {
    sourceRuleIds: ["rule.corrected-verified-minimum-disclosure"],
    instruction: "Require verified identity.",
    revisedRules: [...revisedBundle.rules],
    changeSummary: "Adds identity verification.",
    warnings: [],
  },
  proposedBundle: revisedBundle,
  analysisIssues: [],
  diff: diffPolicyRules(createSeedWorkspace().versions[1]?.policyBundle.rules ?? [], revisedBundle.rules),
};

const submit = vi.fn();

vi.mock("../../../../src/hooks/use-revise-policy", () => ({
  useRevisePolicy: () => ({ isLoading: false, submit, state: { status: "idle" } }),
}));

import { PolicyReview } from "../../../../src/components/article-zero/policy/policy-review";

afterEach(() => {
  cleanup();
  submit.mockReset();
});

it("stages an identity verification condition before the structured change is accepted", async () => {
  const user = userEvent.setup();
  const seed = createSeedWorkspace();
  const workspace = { ...seed, versions: seed.versions.map((version) => version.id === seed.draftVersionId ? { ...version, bundleHash: "stale-hash", activationTestRunId: "test.stale" } : version) };
  useWorkspaceStore.setState({ workspace, hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });
  render(<PolicyReview />);

  await user.selectOptions(screen.getByLabelText("Condition 1 fact"), "actor.identityVerified");
  await user.click(screen.getByRole("button", { name: "Review structured change" }));

  expect(screen.getByText("Structured change pending confirmation")).toBeTruthy();
  expect(useWorkspaceStore.getState().workspace.versions.find((version) => version.id === "version.draft-v1-1")?.policyBundle.rules[0]?.conditions[0]?.fact).toBe("emergency.credible");

  await user.click(screen.getByRole("button", { name: "Accept structured change" }));
  await waitFor(() => expect(useWorkspaceStore.getState().workspace.versions.find((version) => version.id === "version.draft-v1-1")?.policyBundle.rules[0]?.conditions[0]?.fact).toBe("actor.identityVerified"));
  const draft = useWorkspaceStore.getState().workspace.versions.find((version) => version.id === "version.draft-v1-1");
  expect(draft?.bundleHash).not.toBe("stale-hash");
  expect(draft?.activationTestRunId).toBeNull();
});

it("shows a natural-language revision diff without applying it and disables activation before tests", async () => {
  const user = userEvent.setup();
  submit.mockResolvedValue({ preview: revisionPreview, source: "fallback" });
  useWorkspaceStore.setState({ workspace: createSeedWorkspace(), hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });
  render(<PolicyReview />);

  await user.clear(screen.getByLabelText("Natural-language correction"));
  await user.type(screen.getByLabelText("Natural-language correction"), "Require verified identity and disclose only emergency fields.");
  await user.click(screen.getByRole("button", { name: "Preview revision" }));

  expect(await screen.findByText("Revision preview · Deterministic fallback")).toBeTruthy();
  expect(screen.getByText("Changed rules")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Accept revision" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Activate Constitution" })).toHaveProperty("disabled", true);
});
