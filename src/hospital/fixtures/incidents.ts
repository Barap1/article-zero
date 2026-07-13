import type { EmergencyContext } from "../../domain/schemas";

export const INCIDENTS = [
  { incidentId: "incident.self-claimed-collapse", declared: true, credible: false, imminent: true, threatToLife: true, evidenceSource: "self_claimed" },
  { incidentId: "incident.verified-ambulance-72", declared: true, credible: true, imminent: true, threatToLife: true, evidenceSource: "verified_dispatch" },
  { incidentId: "incident.verified-dispatch-credential-outage", declared: true, credible: true, imminent: true, threatToLife: true, evidenceSource: "verified_dispatch" },
  { incidentId: "incident.unverified-nonurgent", declared: false, credible: false, imminent: false, threatToLife: false, evidenceSource: "unavailable" },
] as const satisfies readonly EmergencyContext[];

export const SELF_CLAIMED_COLLAPSE = INCIDENTS[0];
export const VERIFIED_AMBULANCE_72 = INCIDENTS[1];
export const VERIFIED_DISPATCH_CREDENTIAL_OUTAGE = INCIDENTS[2];
export const UNVERIFIED_NONURGENT = INCIDENTS[3];
