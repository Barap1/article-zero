import { describe, expect, it } from "vitest";

import type { PolicyIssue, TestRun } from "../../../src/domain/schemas";
import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { assessActivation } from "../../../src/activation/assess-activation";

function passingRun(bundleHash: string): TestRun {
  return {
    id: "test-run.current",
    constitutionVersionId: "version.draft-v1-1",
    bundleHash,
    startedAt: "2026-07-13T12:00:00.000Z",
    completedAt: "2026-07-13T12:00:01.000Z",
    results: [],
    blockingFailureCount: 0,
    warningFailureCount: 0,
  };
}

function issue(id: string, severity: PolicyIssue["severity"]): PolicyIssue {
  return { id, severity, code: "TEST_ISSUE", title: "Test issue", detail: "Test issue detail.", relatedClauseIds: [], relatedRuleIds: [], suggestedResolution: "Resolve the issue.", acknowledged: false };
}

function currentDraft() {
  const draft = createSeedWorkspace().versions[1];
  if (!draft) throw new Error("draft seed version is missing");
  return { ...draft, bundleHash: "hash.current" };
}

describe("assessActivation", () => {
  it("Given critical or high findings, When assessed, Then activation is blocked", () => {
    const assessment = assessActivation({ draft: currentDraft(), issues: [issue("issue.critical", "critical"), issue("issue.high", "high")], latestTestRun: passingRun("hash.current") });

    expect(assessment.canActivate).toBe(false);
    expect(assessment.blockingReasonCodes).toContain("POLICY_ISSUES");
    expect(assessment.blockingIssues).toHaveLength(2);
  });

  it("Given a stale test run, When assessed, Then activation is blocked", () => {
    const assessment = assessActivation({ draft: currentDraft(), issues: [], latestTestRun: passingRun("hash.stale") });

    expect(assessment.canActivate).toBe(false);
    expect(assessment.bundleHashMatchesLatestTestRun).toBe(false);
    expect(assessment.blockingReasonCodes).toContain("STALE_TEST_RUN");
  });

  it("Given an unacknowledged warning, When assessed, Then activation is blocked until the draft acknowledges it", () => {
    const draft = currentDraft();
    const warning = issue("issue.warning", "warning");

    expect(assessActivation({ draft, issues: [warning], latestTestRun: passingRun(draft.bundleHash) }).canActivate).toBe(false);
    expect(assessActivation({ draft: { ...draft, acknowledgedIssueIds: [warning.id] }, issues: [warning], latestTestRun: passingRun(draft.bundleHash) }).canActivate).toBe(true);
  });
});
