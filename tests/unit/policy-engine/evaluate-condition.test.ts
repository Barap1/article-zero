import { describe, expect, it } from "vitest";

import type {
  AgentAction,
  ConditionExpectedValue,
  EvaluationContext,
  PolicyCondition,
} from "../../../src/domain/schemas";
import type { ConditionOperator, FactKey, PatientField, TruthValue } from "../../../src/domain/catalogs";
import { evaluateCondition, PolicyValidationError } from "../../../src/policy-engine/evaluate-condition";
import { resolveFact } from "../../../src/policy-engine/fact-resolver";

const action: AgentAction = {
  id: "action.test",
  tool: "disclose_patient_data",
  actorId: "actor.test",
  patientId: "patient.test",
  requestedFields: ["homeAddress", "fullName", "bloodType"],
  recipientId: "recipient.test",
  purpose: "treatment",
  message: null,
  claimedEmergency: false,
  sourceRequest: "Test request",
  proposalSummary: "Test proposal",
};

const context: EvaluationContext = {
  actor: {
    id: "actor.test",
    displayName: "Test actor",
    role: "hospital_staff",
    identityVerified: true,
    organizationVerified: true,
    organizationName: "Test hospital",
  },
  emergency: {
    incidentId: "incident.test",
    declared: false,
    credible: false,
    imminent: false,
    threatToLife: false,
    evidenceSource: "self_claimed",
  },
  approval: {
    status: "approved",
    approverRole: "privacy_officer",
    approvalRequestId: "approval.test",
  },
};

function makeCondition(
  fact: FactKey,
  operator: ConditionOperator,
  value: ConditionExpectedValue,
): PolicyCondition {
  return { id: `condition.${fact}`, fact, operator, value, label: `Test ${fact}` };
}

function evaluate(
  fact: FactKey,
  operator: ConditionOperator,
  value: ConditionExpectedValue,
  overrides: { action?: AgentAction; context?: EvaluationContext } = {},
) {
  return evaluateCondition({
    ruleId: "rule.test",
    condition: makeCondition(fact, operator, value),
    action: overrides.action ?? action,
    context: overrides.context ?? context,
  });
}

describe("evaluateCondition", () => {
  const compatibleCases: Array<[ConditionOperator, FactKey, ConditionExpectedValue, TruthValue]> = [
    ["EQUALS", "actor.role", "hospital_staff", "TRUE"],
    ["NOT_EQUALS", "actor.role", "emergency_responder", "TRUE"],
    ["IN", "actor.role", ["hospital_staff", "emergency_responder"], "TRUE"],
    ["CONTAINS_ANY", "request.requestedFields", ["fullName", "homeAddress"], "TRUE"],
    ["CONTAINS_ALL", "request.requestedFields", ["fullName", "bloodType"], "TRUE"],
  ];

  it.each(compatibleCases)("evaluates compatible %s conditions to %s", (operator, fact, value, result) => {
    expect(evaluate(fact, operator, value).result).toBe(result);
  });

  const falseCases: Array<[ConditionOperator, FactKey, ConditionExpectedValue]> = [
    ["EQUALS", "actor.role", "emergency_responder"],
    ["NOT_EQUALS", "actor.role", "hospital_staff"],
    ["IN", "actor.role", ["emergency_responder", "unknown"]],
    ["CONTAINS_ANY", "request.requestedFields", ["clinicalNotes"]],
    ["CONTAINS_ALL", "request.requestedFields", ["fullName", "clinicalNotes"]],
  ];

  it.each(falseCases)("evaluates compatible %s conditions to FALSE", (operator, fact, value) => {
    expect(evaluate(fact, operator, value).result).toBe("FALSE");
  });

  it("returns UNKNOWN for a missing trusted fact", () => {
    const unknownContext: EvaluationContext = {
      ...context,
      actor: { ...context.actor, identityVerified: null },
    };

    expect(evaluate("actor.identityVerified", "EQUALS", true, { context: unknownContext }).result).toBe("UNKNOWN");
    expect(resolveFact("actor.identityVerified", action, unknownContext)).toBeNull();
  });

  it("returns UNKNOWN when the action fact is unavailable", () => {
    const unavailableAction: AgentAction = { ...action, patientId: null };

    expect(evaluate("patient.id", "EQUALS", "patient.test", { action: unavailableAction }).result).toBe("UNKNOWN");
  });

  it("canonicalizes array comparisons without mutating input", () => {
    const requestedFields: PatientField[] = ["homeAddress", "fullName"];
    const inputAction: AgentAction = { ...action, requestedFields };

    const result = evaluate("request.requestedFields", "EQUALS", ["fullName", "homeAddress"], { action: inputAction });

    expect(result.result).toBe("TRUE");
    expect(result.actual).toEqual(["fullName", "homeAddress"]);
    expect(requestedFields).toEqual(["homeAddress", "fullName"]);
  });

  const invalidCases: Array<[ConditionOperator, FactKey, ConditionExpectedValue]> = [
    ["EQUALS", "actor.role", true],
    ["NOT_EQUALS", "actor.role", ["hospital_staff"]],
    ["IN", "actor.role", "hospital_staff"],
    ["CONTAINS_ANY", "actor.role", ["fullName"]],
    ["CONTAINS_ALL", "actor.role", ["fullName"]],
  ];

  it.each(invalidCases)("throws PolicyValidationError for incompatible %s values", (operator, fact, value) => {
    expect(() => evaluate(fact, operator, value)).toThrowError(PolicyValidationError);
  });

  it("does not treat an attacker claim as credible emergency evidence", () => {
    const attackerAction: AgentAction = { ...action, claimedEmergency: true };
    const nonCredibleContext: EvaluationContext = {
      ...context,
      emergency: { ...context.emergency, credible: false },
    };

    const result = evaluate("emergency.credible", "EQUALS", true, {
      action: attackerAction,
      context: nonCredibleContext,
    });

    expect(result.result).toBe("FALSE");
    expect(result.actual).toBe(false);
  });
});
