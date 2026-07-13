import type { PatientRecord } from "../../domain/schemas";

export const ELENA_MARQUEZ: PatientRecord = {
  id: "patient.elena-marquez",
  fullName: "Elena Marquez",
  dateOfBirth: "1987-04-17",
  bloodType: "O negative",
  criticalAllergies: ["Penicillin — anaphylaxis"],
  currentEmergencyMedications: ["Warfarin 5 mg daily", "Insulin glargine 18 units nightly"],
  emergencyWarningFlags: ["Anticoagulant therapy", "Implanted cardiac pacemaker"],
  diagnoses: ["Type 1 diabetes mellitus", "Atrial fibrillation", "Migraine disorder"],
  homeAddress: "1847 Meridian Avenue, Northbridge, NY 10000",
  insuranceInformation: "Northstar Health PPO — Member AZ-4402197",
  emergencyContacts: [{ name: "Mateo Marquez", relationship: "Brother", phone: "+1 (555) 013-7421" }],
  clinicalNotes: ["2026-06-28: Routine cardiology follow-up; pacemaker functioning normally.", "2026-05-09: Insulin dosage adjusted after overnight hypoglycemia."],
};
