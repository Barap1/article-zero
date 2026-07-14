import { describe, expect, it, vi } from "vitest";

import { MINIMUM_EMERGENCY_FIELDS } from "../../../src/domain/catalogs";
import type { AgentAction, ApprovalRequest, AuditEvent, PatientRecord } from "../../../src/domain/schemas";
import { CORRECTED_POLICY_BUNDLE } from "../../../src/hospital/fixtures/constitution";
import { ELENA_MARQUEZ } from "../../../src/hospital/fixtures/patient";
import {
  HERO_ATTACK_SCENARIO,
  LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO,
  STAFF_SENSITIVE_RECORD_SCENARIO,
} from "../../../src/hospital/fixtures/scenarios";
import { executeEnforcedAction } from "../../../src/hospital/enforcement-gateway";
import type { HospitalToolGateway } from "../../../src/hospital/in-memory-tools";

const now = () => new Date("2026-07-13T12:00:00.000Z");

function tools(): HospitalToolGateway {
  return {
    searchPatients: vi.fn(async () => []),
    readPatientRecord: vi.fn(async (): Promise<PatientRecord> => ELENA_MARQUEZ),
    disclosePatientData: vi.fn(async (): Promise<Partial<PatientRecord>> => ({})),
    sendStaffMessage: vi.fn(async () => ({ messageId: "message.test" })),
    verifyResponderCredentials: vi.fn(async () => ({ identityVerified: true, organizationVerified: true })),
    requestHumanApproval: vi.fn(async (request: ApprovalRequest) => request),
    triggerEmergencyAlert: vi.fn(async () => ({ alertId: "alert.test" })),
    writeAuditEvent: vi.fn(async (_event: AuditEvent) => undefined),
  };
}

describe("executeEnforcedAction", () => {
  it("Given a denied action, When enforcement runs, Then it never invokes the protected tool", async () => {
    const gateway = tools();

    const result = await executeEnforcedAction({ action: HERO_ATTACK_SCENARIO.fallbackAction, context: HERO_ATTACK_SCENARIO.evaluationContext, bundle: CORRECTED_POLICY_BUNDLE, gateway, now, idFactory: () => "test" });

    expect(result.decision.outcome).toBe("DENY");
    expect(gateway.disclosePatientData).not.toHaveBeenCalled();
  });

  it("Given an approval-required action, When enforcement runs, Then it never invokes the protected tool", async () => {
    const gateway = tools();
    const action: AgentAction = { ...STAFF_SENSITIVE_RECORD_SCENARIO.fallbackAction, tool: "send_staff_message", patientId: null, requestedFields: [], recipientId: "actor.dr-lena-chen", message: "Review this request." };

    const result = await executeEnforcedAction({ action, context: STAFF_SENSITIVE_RECORD_SCENARIO.evaluationContext, bundle: CORRECTED_POLICY_BUNDLE, gateway, now, idFactory: () => "test" });

    expect(result.decision.outcome).toBe("REQUIRE_HUMAN_APPROVAL");
    expect(gateway.sendStaffMessage).not.toHaveBeenCalled();
  });

  it("Given a permitted field-filtered disclosure, When enforcement runs, Then it passes only approved fields to the tool", async () => {
    const gateway = tools();

    const result = await executeEnforcedAction({ action: LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.fallbackAction, context: LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.evaluationContext, bundle: CORRECTED_POLICY_BUNDLE, gateway, now, idFactory: () => "test" });

    expect(gateway.disclosePatientData).toHaveBeenCalledWith("patient.elena-marquez", [...MINIMUM_EMERGENCY_FIELDS], "actor.metro-ems-17");
    expect(result.toolResult?.exposedPatientFields).toEqual([...MINIMUM_EMERGENCY_FIELDS]);
  });
});
