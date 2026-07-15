const DISPLAY_LABELS: Readonly<Record<string, string>> = {
  ALLOW: "Allowed",
  DENY: "Blocked",
  ALLOW_WITH_FIELD_FILTER: "Allowed with field filter",
  REQUIRE_HUMAN_APPROVAL: "Requires human approval",
  EQUALS: "Equals",
  NOT_EQUALS: "Does not equal",
  CONTAINS_ANY: "Contains any",
  CONTAINS_ALL: "Contains all",
  IN: "Is one of",
  disclose_patient_data: "Disclose patient data",
  search_patients: "Search patient records",
  read_patient_record: "Read patient record",
  send_staff_message: "Send staff message",
  verify_responder_credentials: "Verify responder credentials",
  request_human_approval: "Request human approval",
  trigger_emergency_alert: "Trigger emergency alert",
  write_audit_event: "Write audit event",
  fullName: "Patient name",
  dateOfBirth: "Date of birth",
  bloodType: "Blood type",
  criticalAllergies: "Critical allergies",
  currentEmergencyMedications: "Emergency medications",
  emergencyWarningFlags: "Emergency warning flags",
  homeAddress: "Home address",
  insuranceInformation: "Insurance information",
  emergencyContacts: "Emergency contacts",
  clinicalNotes: "Clinical notes",
  true: "True",
  false: "False",
  null: "Unknown",
  groq: "Groq",
  fallback: "Sample fallback",
  frozen_replay: "Frozen replay",
  deterministic: "Deterministic",
  configured: "Configured",
  live: "Live",
  unknown: "Unknown",
  critical: "Critical",
  high: "High",
  warning: "Warning",
  informational: "Informational",
};

function titleCaseWord(word: string, index: number): string {
  const lower = word.toLowerCase();
  if (lower === "id") return "ID";
  if (lower === "json") return "JSON";
  if (lower === "ai") return "AI";
  return index === 0 ? `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}` : lower;
}

export function formatDisplayLabel(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  const direct = DISPLAY_LABELS[trimmed];
  if (direct !== undefined) return direct;
  const normalized = trimmed.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized.split(" ").map(titleCaseWord).join(" ");
}
