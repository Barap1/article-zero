import type { AgentAction, AuditEvent, EvaluationContext, PolicyBundle, PolicyDecision, ToolExecutionResult } from "../domain/schemas";
import { AgentActionSchema, EvaluationContextSchema, PolicyBundleSchema } from "../domain/schemas";
import { evaluatePolicy } from "../policy-engine/evaluate-policy";
import type { HospitalToolGateway } from "./in-memory-tools";
import { isToolExecutionAuthorized } from "./tool-risk";

export interface EnforcedActionResult {
  readonly action: AgentAction;
  readonly decision: PolicyDecision;
  readonly toolResult: ToolExecutionResult | null;
  readonly auditEvents: AuditEvent[];
}

function timestamp(now: () => Date): string {
  return now().toISOString();
}

function auditEvent(id: string, type: AuditEvent["type"], action: AgentAction, decision: PolicyDecision, at: string): AuditEvent {
  return { id: `audit.${id}`, timestamp: at, type, actorLabel: action.actorId, constitutionVersionId: decision.bundleId, relatedIds: [action.id, decision.id], detail: `${type} for ${action.tool}.`, source: "deterministic", integrityHash: `integrity.${id}` };
}

async function executeTool(action: AgentAction, context: EvaluationContext, decision: PolicyDecision, gateway: HospitalToolGateway, executionId: string, executedAt: string): Promise<ToolExecutionResult> {
  let output: Record<string, unknown>;
  switch (action.tool) {
    case "search_patients":
      output = { patients: await gateway.searchPatients(action.sourceRequest) };
      break;
    case "read_patient_record":
      if (action.patientId === null) throw new Error("Patient record actions require a patient ID.");
      output = { patient: await gateway.readPatientRecord(action.patientId) };
      break;
    case "disclose_patient_data":
      if (action.patientId === null || action.recipientId === null) throw new Error("Patient disclosures require patient and recipient IDs.");
      output = await gateway.disclosePatientData(action.patientId, decision.permittedFields, action.recipientId);
      break;
    case "send_staff_message":
      if (action.recipientId === null || action.message === null) throw new Error("Staff messages require a recipient and message.");
      output = await gateway.sendStaffMessage(action.recipientId, action.message);
      break;
    case "verify_responder_credentials":
      output = await gateway.verifyResponderCredentials(action.actorId);
      break;
    case "request_human_approval":
      output = { approval: await gateway.requestHumanApproval({ id: `approval.${executionId}`, action, context, constitutionVersionId: decision.bundleId, status: "pending", createdAt: executedAt, resolvedAt: null, resolvedByActorId: null }) };
      break;
    case "trigger_emergency_alert":
      output = await gateway.triggerEmergencyAlert(context.emergency.incidentId, action.message ?? action.sourceRequest);
      break;
    case "write_audit_event":
      output = {};
      break;
  }
  return { executionId, tool: action.tool, executed: true, output, exposedPatientFields: action.tool === "disclose_patient_data" ? [...decision.permittedFields] : [], executedAt };
}

export async function executeEnforcedAction(input: { readonly action: AgentAction; readonly context: EvaluationContext; readonly bundle: PolicyBundle; readonly gateway: HospitalToolGateway; readonly now: () => Date; readonly idFactory: () => string }): Promise<EnforcedActionResult> {
  const action = AgentActionSchema.parse(input.action);
  const context = EvaluationContextSchema.parse(input.context);
  const bundle = PolicyBundleSchema.parse(input.bundle);
  const decision = evaluatePolicy({ action, context, bundle, now: timestamp(input.now), decisionId: input.idFactory() });
  const decisionEvent = auditEvent(input.idFactory(), "POLICY_DECIDED", action, decision, timestamp(input.now));
  const auditEvents = [decisionEvent];
  await input.gateway.writeAuditEvent(decisionEvent);
  if (!decision.toolExecutionPermitted || !isToolExecutionAuthorized({ action, decision, bundle })) {
    const type = decision.requiresApproval ? "APPROVAL_REQUESTED" : "TOOL_BLOCKED";
    const event = auditEvent(input.idFactory(), type, action, decision, timestamp(input.now));
    auditEvents.push(event);
    await input.gateway.writeAuditEvent(event);
    return { action, decision, toolResult: null, auditEvents };
  }
  const toolResult = await executeTool(action, context, decision, input.gateway, input.idFactory(), timestamp(input.now));
  const event = auditEvent(input.idFactory(), "TOOL_EXECUTED", action, decision, timestamp(input.now));
  auditEvents.push(event);
  await input.gateway.writeAuditEvent(event);
  return { action, decision, toolResult, auditEvents };
}
