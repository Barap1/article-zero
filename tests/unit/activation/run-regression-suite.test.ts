import { describe, expect, it } from "vitest";

import { assessActivation } from "../../../src/activation/assess-activation";
import { runRegressionSuite } from "../../../src/activation/run-regression-suite";
import { SEEDED_REGRESSION_CASES } from "../../../src/activation/seeded-regression-cases";
import { CORRECTED_POLICY_BUNDLE } from "../../../src/hospital/fixtures/constitution";
import { analyzePolicyBundle } from "../../../src/policy-engine/analyze-policy-bundle";
import { hashPolicyBundle } from "../../../src/policy-engine/hash-policy-bundle";
import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";

const now = (): Date => new Date("2026-07-13T12:00:00.000Z");

describe("runRegressionSuite", () => {
  it("Given the seeded cases, When listed, Then presents the three judged cases before the break-glass control", () => {
    expect(SEEDED_REGRESSION_CASES.map((testCase) => testCase.id)).toEqual([
      "attack.fake-responder-full-record",
      "control.verified-responder-minimum",
      "control.noncredible-responder-request",
      "control.trusted-emergency-credential-outage",
    ]);
  });

  it("Given the legacy baseline, When the seeded suite runs, Then the fake responder attack remains the unsafe failure", async () => {
    const workspace = createSeedWorkspace();
    const legacy = workspace.versions[0];
    if (!legacy) throw new Error("legacy seed version is missing");

    const run = await runRegressionSuite({ version: legacy, cases: SEEDED_REGRESSION_CASES, now, idFactory: () => "run-1" });

    expect(run.results[0]?.passed).toBe(false);
    expect(run.blockingFailureCount).toBe(4);
  });

  it("Given the seeded pre-repair draft, When the suite runs, Then exactly the verified-responder minimum-field case blocks", async () => {
    const workspace = createSeedWorkspace();
    const draft = workspace.versions[1];
    if (!draft) throw new Error("draft seed version is missing");

    const run = await runRegressionSuite({ version: draft, cases: SEEDED_REGRESSION_CASES, now, idFactory: () => "run-1" });
    const blockingFailures = run.results.filter((result) => !result.passed && (result.severity === "critical" || result.severity === "high"));

    expect(blockingFailures.map((result) => result.testCaseId)).toEqual(["control.verified-responder-minimum"]);
    expect(run.results.filter((result) => result.passed).map((result) => result.testCaseId)).toEqual([
      "attack.fake-responder-full-record",
      "control.noncredible-responder-request",
      "control.trusted-emergency-credential-outage",
    ]);
    expect(run.results[1]?.actualPermittedFields).toEqual(["criticalAllergies", "currentEmergencyMedications", "emergencyWarningFlags"]);
    expect(run.results[1]?.expectedPermittedFields).toEqual(["fullName", "bloodType", "criticalAllergies", "currentEmergencyMedications", "emergencyWarningFlags"]);
    expect(run.blockingFailureCount).toBe(1);
  });

  it("Given the repaired bundle and a fresh test run, When activation is assessed, Then activation is enabled", async () => {
    const workspace = createSeedWorkspace();
    const seededDraft = workspace.versions[1];
    if (!seededDraft) throw new Error("draft seed version is missing");
    const draft = { ...seededDraft, policyBundle: CORRECTED_POLICY_BUNDLE, bundleHash: await hashPolicyBundle(CORRECTED_POLICY_BUNDLE) };
    const run = await runRegressionSuite({ version: draft, cases: SEEDED_REGRESSION_CASES, now, idFactory: () => "run-1" });

    expect(run.results.every((result) => result.passed)).toBe(true);
    expect(run.blockingFailureCount).toBe(0);
    expect(run.bundleHash).toBe(draft.bundleHash);
    expect(assessActivation({ draft, issues: analyzePolicyBundle(draft.policyBundle), latestTestRun: run })).toMatchObject({
      canActivate: true,
      bundleHashMatchesLatestTestRun: true,
      blockingReasonCodes: [],
    });
  });
});
