// @vitest-environment node

import { describe, expect, it } from "vitest";

import { assessActivation } from "../../src/activation/assess-activation";
import { deriveRegressionRemediation } from "../../src/activation/regression-remediation";
import { runRegressionSuite } from "../../src/activation/run-regression-suite";
import { SEEDED_REGRESSION_CASES } from "../../src/activation/seeded-regression-cases";
import { FallbackAiProvider } from "../../src/ai/fallback-provider";
import { createCompilePostHandler } from "../../src/app/api/_lib/handlers";
import { CompilePreviewResponseSchema } from "../../src/domain/api";
import { CORRECTED_POLICY_BUNDLE } from "../../src/hospital/fixtures/constitution";
import { analyzePolicyBundle } from "../../src/policy-engine/analyze-policy-bundle";
import { hashPolicyBundle } from "../../src/policy-engine/hash-policy-bundle";
import { createSeedWorkspace } from "../../src/workspace/create-seed-workspace";
import { workspaceReducer } from "../../src/workspace/workspace-reducer";

function request(body: unknown): Request {
  return new Request("http://localhost/api/compile", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "demo-flow-test" }, body: JSON.stringify(body) });
}

describe("seeded remediation flow", () => {
  it("repairs the one intended failure into a current, activatable bundle", async () => {
    const workspace = createSeedWorkspace();
    const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
    if (!draft) throw new Error("draft seed version is missing");

    const preRepairRun = await runRegressionSuite({ version: draft, cases: SEEDED_REGRESSION_CASES, now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "demo" });
    const failedResult = preRepairRun.results.find((result) => !result.passed);
    const failedCase = SEEDED_REGRESSION_CASES.find((testCase) => testCase.id === failedResult?.testCaseId);
    if (!failedResult || !failedCase) throw new Error("the seeded repair failure is missing");
    const remediation = deriveRegressionRemediation({ version: draft, testCase: failedCase, result: failedResult });
    if (!remediation) throw new Error("the seeded repair is missing");
    const clause = draft.clauses.find((candidate) => candidate.id === remediation.sourceClauseId);
    if (!clause) throw new Error("the seeded repair clause is missing");

    expect(preRepairRun.results.filter((result) => !result.passed)).toHaveLength(1);
    expect(failedResult.testCaseId).toBe("control.verified-responder-minimum");
    expect(remediation.sourceClauseId).toBe("clause.emergency-response");
    expect(remediation.sourceRuleIds).toEqual(["rule.corrected-verified-minimum-disclosure"]);

    const response = await createCompilePostHandler(() => new FallbackAiProvider())(request({
      clause: { ...clause, text: remediation.suggestedClauseText },
      existingBundle: draft.policyBundle,
    }));
    const preview = CompilePreviewResponseSchema.parse(await response.json()).data;
    const acceptedWorkspace = workspaceReducer(workspace, { type: "ACCEPT_COMPILE_PREVIEW", clauseId: remediation.sourceClauseId, preview, bundleHash: await hashPolicyBundle(preview.proposedBundle) });
    const repairedDraft = acceptedWorkspace.versions.find((version) => version.id === acceptedWorkspace.draftVersionId);
    if (!repairedDraft) throw new Error("accepted repaired draft is missing");
    const repairedRun = await runRegressionSuite({ version: repairedDraft, cases: SEEDED_REGRESSION_CASES, now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "demo" });
    const assessment = assessActivation({ draft: repairedDraft, issues: analyzePolicyBundle(repairedDraft.policyBundle), latestTestRun: repairedRun });

    expect(response.status).toBe(200);
    expect(preview.proposedBundle.rules).toEqual(CORRECTED_POLICY_BUNDLE.rules);
    expect(preview.analysisIssues.filter((issue) => issue.severity === "critical" || issue.severity === "high")).toEqual([]);
    expect(repairedRun.results.every((result) => result.passed)).toBe(true);
    expect(repairedRun.results[0]?.actualOutcome).toBe("DENY");
    expect(repairedRun.blockingFailureCount).toBe(0);
    expect(repairedRun.bundleHash).toBe(repairedDraft.bundleHash);
    expect(assessment.canActivate).toBe(true);
    expect(assessment.blockingReasonCodes).toEqual([]);
  });
});
