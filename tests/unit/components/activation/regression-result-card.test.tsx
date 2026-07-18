import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import type { RegressionRemediation } from "../../../../src/activation/regression-remediation";
import { RegressionResultCard } from "../../../../src/components/article-zero/activation/regression-result-card";
import type { RegressionTestCase, RegressionTestResult } from "../../../../src/domain/schemas";

afterEach(cleanup);

const testCase: RegressionTestCase = {
  id: "control.verified-responder-minimum",
  name: "Verified responder minimum disclosure",
  severity: "critical",
  scenarioId: "scenario.verified-responder-minimum-record",
  expectedOutcome: "ALLOW_WITH_FIELD_FILTER",
  expectedPermittedFields: ["fullName", "bloodType", "criticalAllergies", "currentEmergencyMedications", "emergencyWarningFlags"],
};

const failedResult: RegressionTestResult = {
  testCaseId: testCase.id,
  passed: false,
  severity: testCase.severity,
  expectedOutcome: testCase.expectedOutcome,
  actualOutcome: testCase.expectedOutcome,
  expectedPermittedFields: [...testCase.expectedPermittedFields],
  actualPermittedFields: ["criticalAllergies", "currentEmergencyMedications", "emergencyWarningFlags"],
  decisionId: "decision.card-test",
  failureDetail: "Expected fields do not match.",
};

const remediation: RegressionRemediation = {
  testCaseId: testCase.id,
  testName: testCase.name,
  summary: "Patient name and blood type are missing from the minimum emergency disclosure.",
  sourceClauseId: "clause.emergency-response",
  sourceRuleIds: ["rule.corrected-verified-minimum-disclosure"],
  missingFields: ["fullName", "bloodType"],
  unexpectedFields: [],
  suggestedClauseText: "Disclose patient name, blood type, critical allergies, current emergency medications, and emergency warning flags.",
};

it("presents a plain-language failure, collapsed technical details, and one repair action", async () => {
  const onReviewRepair = vi.fn();
  render(<RegressionResultCard testCase={testCase} result={failedResult} remediation={remediation} onReviewRepair={onReviewRepair} />);

  expect(screen.getByText("Fail")).toBeTruthy();
  expect(screen.getByText(testCase.name)).toBeTruthy();
  expect(screen.getByText(remediation.summary)).toBeTruthy();
  const details = screen.getByText("Technical details").closest("details");
  expect(details?.open).toBe(false);
  expect(details?.textContent).toContain("ALLOW_WITH_FIELD_FILTER");
  expect(details?.textContent).toContain("currentEmergencyMedications");

  await userEvent.setup().click(screen.getByRole("button", { name: "Review suggested repair" }));

  expect(onReviewRepair).toHaveBeenCalledWith(remediation);
});

it("does not offer repair for a passing result", () => {
  render(<RegressionResultCard testCase={testCase} result={{ ...failedResult, passed: true }} remediation={null} onReviewRepair={vi.fn()} />);

  expect(screen.getByText("Pass")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Review suggested repair" })).toBeNull();
});
