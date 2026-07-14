import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import type { CompilePreview } from "../../../../src/domain/schemas";
import { CORRECTED_POLICY_BUNDLE } from "../../../../src/hospital/fixtures/constitution";
import { diffPolicyRules } from "../../../../src/policy-engine/policy-diff";
import { createSeedWorkspace } from "../../../../src/workspace/create-seed-workspace";
import { useWorkspaceStore } from "../../../../src/workspace/workspace-store";

const compilePreview: CompilePreview = {
  result: {
    sourceClauseId: "clause.emergency-response",
    normalizedClause: "Verified responders receive only minimum emergency information.",
    interpretationSummary: "Replaced the legacy full-record exception.",
    rules: [...CORRECTED_POLICY_BUNDLE.rules],
    ambiguities: [],
    assumptions: [],
  },
  proposedBundle: CORRECTED_POLICY_BUNDLE,
  analysisIssues: [],
  diff: diffPolicyRules(createSeedWorkspace().versions[0]?.policyBundle.rules ?? [], CORRECTED_POLICY_BUNDLE.rules),
};

const submit = vi.fn();

vi.mock("../../../../src/hooks/use-compile-clause", () => ({
  useCompileClause: () => ({ isLoading: false, submit, state: { status: "idle" } }),
}));

import { ConstitutionWorkspace } from "../../../../src/components/article-zero/constitution/constitution-workspace";

afterEach(() => {
  cleanup();
  submit.mockReset();
});

it("marks an edited legacy clause dirty", async () => {
  const user = userEvent.setup();
  useWorkspaceStore.setState({ workspace: createSeedWorkspace(), hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });
  render(<ConstitutionWorkspace />);

  await user.click(screen.getByRole("button", { name: /Emergency Assistance/ }));
  await user.clear(screen.getByLabelText("Clause text"));
  await user.type(screen.getByLabelText("Clause text"), "A revised synthetic clause.");

  expect(screen.getAllByText("Draft changed")).toHaveLength(2);
  expect(useWorkspaceStore.getState().workspace.versions.find((version) => version.id === "version.draft-v1-1")?.clauses.find((clause) => clause.id === "clause.emergency-response")?.status).toBe("dirty");
});

it("shows the fallback source and requires review before applying compiled rules", async () => {
  const user = userEvent.setup();
  submit.mockResolvedValue({ preview: compilePreview, source: "fallback" });
  useWorkspaceStore.setState({ workspace: createSeedWorkspace(), hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });
  render(<ConstitutionWorkspace />);

  await user.click(screen.getByRole("button", { name: /Emergency Assistance/ }));
  await user.click(screen.getByRole("button", { name: "Compile clause" }));

  expect(await screen.findByText("Deterministic fallback")) .toBeTruthy();
  expect(screen.getByText("Added rules")).toBeTruthy();
  expect(useWorkspaceStore.getState().workspace.versions.find((version) => version.id === "version.draft-v1-1")?.clauses.find((clause) => clause.id === "clause.emergency-response")?.lastCompiledText).toBeNull();

  await user.click(screen.getByRole("button", { name: "Accept compiled policy" }));
  await waitFor(() => expect(useWorkspaceStore.getState().workspace.versions.find((version) => version.id === "version.draft-v1-1")?.clauses.find((clause) => clause.id === "clause.emergency-response")?.lastCompiledText).toBe("Verified responders receive only minimum emergency information."));
});
