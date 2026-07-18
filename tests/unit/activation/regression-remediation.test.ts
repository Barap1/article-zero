import { describe, expect, it } from "vitest";

import { SEEDED_REGRESSION_CASES } from "../../../src/activation/seeded-regression-cases";
import { deriveRegressionRemediation } from "../../../src/activation/regression-remediation";
import type { RegressionTestResult } from "../../../src/domain/schemas";
import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";

const workspace = createSeedWorkspace();
const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
if (draft === undefined) throw new Error("The draft is required for remediation tests.");

function result(overrides: Partial<RegressionTestResult>): RegressionTestResult {
  const testCase = SEEDED_REGRESSION_CASES[1];
  if (testCase === undefined) throw new Error("The verified responder test is required.");
  return {
    testCaseId: testCase.id,
    passed: false,
    severity: testCase.severity,
    expectedOutcome: testCase.expectedOutcome,
    actualOutcome: testCase.expectedOutcome,
    expectedPermittedFields: [...testCase.expectedPermittedFields],
    actualPermittedFields: ["criticalAllergies", "currentEmergencyMedications", "emergencyWarningFlags"],
    decisionId: "decision.remediation-test",
    failureDetail: "The field set does not match.",
    ...overrides,
  };
}

describe("deriveRegressionRemediation", () => {
  it("names missing patient name and blood type and builds the affected repair clause", () => {
    const testCase = SEEDED_REGRESSION_CASES[1];
    if (testCase === undefined) throw new Error("The verified responder test is required.");

    const remediation = deriveRegressionRemediation({ version: draft, testCase, result: result({}) });

    expect(remediation).not.toBeNull();
    expect(remediation?.missingFields).toEqual(["fullName", "bloodType"]);
    expect(remediation?.unexpectedFields).toEqual([]);
    expect(remediation?.summary).toMatch(/patient name and blood type are missing/i);
    expect(remediation?.sourceClauseId).toBe("clause.emergency-response");
    expect(remediation?.sourceRuleIds).toEqual(["rule.corrected-verified-minimum-disclosure"]);
    expect(remediation?.suggestedClauseText).toContain("patient name, blood type, critical allergies, current emergency medications, and emergency warning flags");
  });

  it("explains unexpected fields and a wrong outcome using human labels", () => {
    const testCase = SEEDED_REGRESSION_CASES[1];
    if (testCase === undefined) throw new Error("The verified responder test is required.");

    const remediation = deriveRegressionRemediation({
      version: draft,
      testCase,
      result: result({ actualOutcome: "ALLOW", actualPermittedFields: [...testCase.expectedPermittedFields, "homeAddress"] }),
    });

    expect(remediation?.unexpectedFields).toEqual(["homeAddress"]);
    expect(remediation?.summary).toMatch(/home address/i);
    expect(remediation?.summary).toMatch(/allowed with field filter.*allowed/i);
  });

  it("does not create a repair for a passing result", () => {
    const testCase = SEEDED_REGRESSION_CASES[1];
    if (testCase === undefined) throw new Error("The verified responder test is required.");

    expect(deriveRegressionRemediation({ version: draft, testCase, result: result({ passed: true }) })).toBeNull();
  });
});
