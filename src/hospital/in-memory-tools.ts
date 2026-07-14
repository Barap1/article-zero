import type { PatientField } from "../domain/catalogs";
import type { ApprovalRequest, AuditEvent, PatientRecord } from "../domain/schemas";
import { ACTORS } from "./fixtures/actors";
import { ELENA_MARQUEZ } from "./fixtures/patient";
import { projectPatientFields } from "./field-projection";

export interface HospitalToolGateway {
  searchPatients(query: string): Promise<Array<Pick<PatientRecord, "id" | "fullName" | "dateOfBirth">>>;
  readPatientRecord(patientId: string): Promise<PatientRecord>;
  disclosePatientData(patientId: string, fields: PatientField[], recipientId: string): Promise<Partial<PatientRecord>>;
  sendStaffMessage(recipientId: string, message: string): Promise<{ messageId: string }>;
  verifyResponderCredentials(actorId: string): Promise<{ identityVerified: boolean; organizationVerified: boolean }>;
  requestHumanApproval(request: ApprovalRequest): Promise<ApprovalRequest>;
  triggerEmergencyAlert(incidentId: string, message: string): Promise<{ alertId: string }>;
  writeAuditEvent(event: AuditEvent): Promise<void>;
}

function patient(patientId: string): PatientRecord {
  if (patientId !== ELENA_MARQUEZ.id) throw new Error(`Unknown synthetic patient: ${patientId}`);
  return ELENA_MARQUEZ;
}

export function createInMemoryHospitalTools(): HospitalToolGateway {
  const auditEvents: AuditEvent[] = [];
  return {
    async searchPatients(query) {
      const normalized = query.trim().toLowerCase();
      return ELENA_MARQUEZ.fullName.toLowerCase().includes(normalized) ? [{ id: ELENA_MARQUEZ.id, fullName: ELENA_MARQUEZ.fullName, dateOfBirth: ELENA_MARQUEZ.dateOfBirth }] : [];
    },
    async readPatientRecord(patientId) {
      return patient(patientId);
    },
    async disclosePatientData(patientId, fields, _recipientId) {
      return projectPatientFields(patient(patientId), fields);
    },
    async sendStaffMessage(recipientId, _message) {
      return { messageId: `message.${recipientId}` };
    },
    async verifyResponderCredentials(actorId) {
      const actor = ACTORS.find((candidate) => candidate.id === actorId);
      return { identityVerified: actor?.identityVerified === true, organizationVerified: actor?.organizationVerified === true };
    },
    async requestHumanApproval(request) {
      return request;
    },
    async triggerEmergencyAlert(incidentId, _message) {
      return { alertId: `alert.${incidentId}` };
    },
    async writeAuditEvent(event) {
      auditEvents.push(event);
    },
  };
}
