import { describe, expect, it } from "vitest";

import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { runRegressionSuite } from "../../../src/activation/run-regression-suite";
import { SEEDED_REGRESSION_CASES } from "../../../src/activation/seeded-regression-cases";

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

  it("Given the legacy baseline, When the seeded suite runs, Then all three judged cases fail", async () => {
    const workspace = createSeedWorkspace();
    const legacy = workspace.versions[0];
    if (!legacy) throw new Error("legacy seed version is missing");

    const run = await runRegressionSuite({ version: legacy, cases: SEEDED_REGRESSION_CASES, now, idFactory: () => "run-1" });

    expect(run.results.slice(0, 3).every((result) => !result.passed)).toBe(true);
    expect(run.blockingFailureCount).toBe(4);
  });

  it("Given the corrected draft, When the seeded suite runs twice with fixed inputs, Then it returns the same exact outcomes and fields", async () => {
    const workspace = createSeedWorkspace();
    const draft = workspace.versions[1];
    if (!draft) throw new Error("draft seed version is missing");

    const first = await runRegressionSuite({ version: draft, cases: SEEDED_REGRESSION_CASES, now, idFactory: () => "run-1" });
    const second = await runRegressionSuite({ version: draft, cases: SEEDED_REGRESSION_CASES, now, idFactory: () => "run-1" });

    expect(first).toEqual(second);
    expect(first.results.every((result) => result.passed)).toBe(true);
    expect(first.results[1]?.actualPermittedFields).toEqual(first.results[1]?.expectedPermittedFields);
  });
});
