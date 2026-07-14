import type { Severity } from "../domain/catalogs";
import {
  ActivationAssessmentSchema,
  ConstitutionVersionSchema,
  type ActivationAssessment,
  type PolicyIssue,
  type RegressionTestResult,
  type TestRun,
} from "../domain/schemas";

function blocksActivation(severity: Severity): boolean {
  return severity === "critical" || severity === "high";
}

export function assessActivation(input: {
  readonly draft: Parameters<typeof ConstitutionVersionSchema.safeParse>[0];
  readonly issues: readonly PolicyIssue[];
  readonly latestTestRun: TestRun | null;
}): ActivationAssessment {
  const parsedDraft = ConstitutionVersionSchema.safeParse(input.draft);
  const schemaValid = parsedDraft.success;
  const draft = parsedDraft.data;
  const latestTestRun = input.latestTestRun;
  const bundleHashMatchesLatestTestRun = draft !== undefined
    && latestTestRun !== null
    && latestTestRun.bundleHash === draft.bundleHash;
  const blockingIssues = input.issues.filter((issue) => blocksActivation(issue.severity));
  const warningIssues = input.issues.filter((issue) => issue.severity === "warning");
  const acknowledgedIssueIds = draft?.acknowledgedIssueIds ?? [];
  const unacknowledgedWarnings = warningIssues.filter((issue) => !acknowledgedIssueIds.includes(issue.id));
  const blockingTestFailures: RegressionTestResult[] = latestTestRun === null
    ? []
    : latestTestRun.results.filter((result) => !result.passed && blocksActivation(result.severity));
  const blockingReasonCodes: ActivationAssessment["blockingReasonCodes"] = [];

  if (!schemaValid) blockingReasonCodes.push("SCHEMA_INVALID");
  if (blockingIssues.length > 0) blockingReasonCodes.push("POLICY_ISSUES");
  if (latestTestRun === null) blockingReasonCodes.push("NO_TEST_RUN");
  if (latestTestRun !== null && !bundleHashMatchesLatestTestRun) blockingReasonCodes.push("STALE_TEST_RUN");
  if (blockingTestFailures.length > 0) blockingReasonCodes.push("TEST_FAILURES");
  if (unacknowledgedWarnings.length > 0) blockingReasonCodes.push("UNACKNOWLEDGED_WARNINGS");

  return ActivationAssessmentSchema.parse({
    canActivate: blockingReasonCodes.length === 0,
    schemaValid,
    bundleHashMatchesLatestTestRun,
    blockingReasonCodes,
    blockingIssues,
    warningIssues,
    latestTestRunId: latestTestRun?.id ?? null,
    blockingTestFailures,
    unacknowledgedWarnings,
  });
}
