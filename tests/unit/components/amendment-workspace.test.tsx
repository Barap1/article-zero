import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import type { RegressionRemediation } from "../../../src/activation/regression-remediation";
import { AmendmentWorkspace } from "../../../src/components/article-zero/amendment-workspace";
import type { CompilePreview } from "../../../src/domain/schemas";
import { CORRECTED_POLICY_BUNDLE } from "../../../src/hospital/fixtures/constitution";
import { diffPolicyRules } from "../../../src/policy-engine/policy-diff";
import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { useWorkspaceStore } from "../../../src/workspace/workspace-store";

const submit = vi.fn();

vi.mock("../../../src/hooks/use-compile-clause", () => ({
  useCompileClause: () => ({ isLoading: false, submit, state: { status: "idle" } }),
}));

const remediation: RegressionRemediation = {
  testCaseId: "control.verified-responder-minimum",
  testName: "Verified responder minimum disclosure",
  summary: "Patient name and blood type are missing from the minimum emergency disclosure.",
  sourceClauseId: "clause.emergency-response",
  sourceRuleIds: ["rule.corrected-verified-minimum-disclosure"],
  missingFields: ["fullName", "bloodType"],
  unexpectedFields: [],
  suggestedClauseText: "Disclose patient name, blood type, critical allergies, current emergency medications, and emergency warning flags.",
};

const compilePreview: CompilePreview = {
  result: {
    sourceClauseId: "clause.emergency-response",
    normalizedClause: remediation.suggestedClauseText,
    interpretationSummary: "The suggested emergency disclosure repair is ready for review.",
    rules: [...CORRECTED_POLICY_BUNDLE.rules],
    ambiguities: [],
    assumptions: [],
  },
  proposedBundle: CORRECTED_POLICY_BUNDLE,
  analysisIssues: [],
  diff: diffPolicyRules(createSeedWorkspace().versions[0]?.policyBundle.rules ?? [], CORRECTED_POLICY_BUNDLE.rules),
};

afterEach(() => {
  cleanup();
  submit.mockReset();
});

it("shows the failed test context and applies the suggestion only to draft text", async () => {
  const workspace = createSeedWorkspace();
  useWorkspaceStore.setState({ workspace: { ...workspace, selectedClauseId: remediation.sourceClauseId }, activeRemediation: remediation, hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });
  render(<AmendmentWorkspace onContinueTesting={vi.fn()} />);

  expect(screen.getByText("Verified responder minimum disclosure")).toBeTruthy();
  expect(screen.getByText(remediation.summary)).toBeTruthy();
  expect(screen.getByText("Patient name")).toBeTruthy();
  expect(screen.getByText("Blood type")).toBeTruthy();

  await userEvent.setup().click(screen.getByRole("button", { name: "Apply suggested repair" }));

  const textarea = screen.getByLabelText("Proposed clause text");
  if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("The proposed clause field must be a textarea.");
  expect(textarea.value).toBe(remediation.suggestedClauseText);
  expect(submit).not.toHaveBeenCalled();
  expect(useWorkspaceStore.getState().workspace.versions.find((version) => version.id === workspace.draftVersionId)?.clauses.find((clause) => clause.id === remediation.sourceClauseId)?.lastCompiledText).toBeNull();
});

it("shows Return to testing only after accepting the compile preview", async () => {
  const onContinueTesting = vi.fn();
  const workspace = createSeedWorkspace();
  useWorkspaceStore.setState({ workspace: { ...workspace, selectedClauseId: remediation.sourceClauseId }, activeRemediation: remediation, hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });
  submit.mockResolvedValue({ preview: compilePreview, source: "deterministic" });
  render(<AmendmentWorkspace onContinueTesting={onContinueTesting} />);

  expect(screen.getByRole("button", { name: "Return to testing" }).hasAttribute("disabled")).toBe(true);
  await userEvent.setup().click(screen.getByRole("button", { name: "Compile preview" }));
  await userEvent.setup().click(await screen.findByRole("button", { name: "Accept compiled policy" }));

  await waitFor(() => expect(screen.getByRole("button", { name: "Return to testing" }).hasAttribute("disabled")).toBe(false));
  await userEvent.setup().click(screen.getByRole("button", { name: "Return to testing" }));
  expect(onContinueTesting).toHaveBeenCalledTimes(1);
});
