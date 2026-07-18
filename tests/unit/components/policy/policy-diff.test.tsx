import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { PolicyDiff } from "../../../../src/components/article-zero/policy/policy-diff";
import type { PolicyStructuralDiff } from "../../../../src/domain/schemas";

afterEach(cleanup);

const diff: PolicyStructuralDiff = {
  addedRules: [],
  removedRules: [],
  unchangedRuleIds: [],
  changedRules: [{
    ruleId: "rule.emergency.verified-minimum-disclosure",
    changes: [
      { field: "appliesToTools", before: ["read_patient_record"], after: ["disclose_patient_data"], summary: "appliesToTools changed." },
      {
        field: "allowedFields",
        before: ["criticalAllergies"],
        after: ["fullName", "bloodType", "criticalAllergies", "currentEmergencyMedications", "emergencyWarningFlags"],
        summary: "allowedFields changed.",
      },
      {
        field: "conditions",
        before: [{ id: "condition.before", fact: "actor.identityVerified", operator: "EQUALS", value: false, label: "Responder is not verified" }],
        after: [{ id: "condition.after", fact: "actor.identityVerified", operator: "EQUALS", value: true, label: "Responder identity is verified" }],
        summary: "conditions changed.",
      },
      {
        field: "description",
        before: "Short text",
        after: "This is a deliberately long policy explanation that should wrap at word boundaries instead of collapsing into one character per line.",
        summary: "description changed.",
      },
    ],
  }],
};

it("renders arrays, conditions, and long values as readable before/after content", () => {
  const { container } = render(<PolicyDiff diff={diff} />);

  expect(screen.getByText("Applies to tools")).toBeTruthy();
  expect(screen.getByText("Allowed fields")).toBeTruthy();
  expect(screen.getAllByText("Before")).toHaveLength(4);
  expect(screen.getAllByText("After")).toHaveLength(4);
  expect(screen.getByText("Disclose patient data")).toBeTruthy();
  expect(screen.getByText("Patient name")).toBeTruthy();
  expect(screen.getByText("Blood type")).toBeTruthy();
  expect(screen.getAllByText("actor.identityVerified")).toHaveLength(2);
  expect(screen.getAllByText("Equals")).toHaveLength(2);
  expect(screen.getByText("Responder identity is verified")).toBeTruthy();
  expect(screen.getAllByText(/deliberately long policy explanation/)).toHaveLength(2);
  expect(container.querySelector(".az-policy-field-values")?.textContent).not.toMatch(/\[\"fullName\",\"bloodType\"/);
  expect(container.querySelector(".az-policy-field-values")).toBeTruthy();
  expect(container.querySelector("details")?.open).toBe(false);
});

it("uses a shrinking diff layout instead of a fixed-width content surface", () => {
  const { container } = render(<PolicyDiff diff={diff} />);
  const diffElement = container.querySelector(".az-policy-diff");
  const values = container.querySelector(".az-policy-field-values");

  expect(diffElement).toBeTruthy();
  expect(values).toBeTruthy();
  expect(values?.className).toContain("az-policy-field-values");
  expect(values?.getAttribute("style")).toBeNull();
});
