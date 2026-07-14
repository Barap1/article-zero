import { expect, it } from "vitest";

import { activateConstitution } from "../../src/activation/activate-constitution";
import { runRegressionSuite } from "../../src/activation/run-regression-suite";
import { SEEDED_REGRESSION_CASES } from "../../src/activation/seeded-regression-cases";
import { hashPolicyBundle } from "../../src/policy-engine/hash-policy-bundle";
import { createSeedWorkspace } from "../../src/workspace/create-seed-workspace";
import { workspaceReducer } from "../../src/workspace/workspace-reducer";

it("Given a current passing test run, When activation succeeds and its transition is applied again, Then it creates one snapshot, audit event, and clean child draft", async () => {
  const now = (): Date => new Date("2026-07-13T12:00:00.000Z");
  const workspace = createSeedWorkspace();
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  if (!draft) throw new Error("draft seed version is missing");
  const bundleHash = await hashPolicyBundle(draft.policyBundle);
  const version = { ...draft, bundleHash };
  const testRun = await runRegressionSuite({ version, cases: SEEDED_REGRESSION_CASES, now, idFactory: () => "test-run" });
  const readyWorkspace = { ...workspace, versions: workspace.versions.map((candidate) => candidate.id === version.id ? version : candidate), testRuns: [testRun] };

  const transition = await activateConstitution({ workspace: readyWorkspace, draftVersionId: version.id, issues: [], now, idFactory: () => "activation" });
  const appliedOnce = workspaceReducer(readyWorkspace, { type: "ACTIVATE_VERSION", result: transition });
  const appliedTwice = workspaceReducer(appliedOnce, { type: "ACTIVATE_VERSION", result: transition });

  expect(transition.workspace.activeVersionId).toBe(version.id);
  expect(transition.workspace.versions.find((candidate) => candidate.id === transition.archivedVersionId)?.status).toBe("ARCHIVED");
  expect(transition.workspace.versions.find((candidate) => candidate.id === transition.newDraftVersionId)?.status).toBe("DRAFT");
  expect(transition.workspace.auditEvents.filter((event) => event.type === "CONSTITUTION_ACTIVATED")).toHaveLength(1);
  expect(appliedTwice).toEqual(appliedOnce);
});
