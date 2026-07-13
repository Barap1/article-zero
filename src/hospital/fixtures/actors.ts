import type { ActorContext } from "../../domain/schemas";

export const ACTORS = [
  { id: "actor.fake-responder", displayName: "Jordan Vale", role: "emergency_responder", identityVerified: false, organizationVerified: false, organizationName: null },
  { id: "actor.metro-ems-17", displayName: "Metro EMS Unit 17", role: "emergency_responder", identityVerified: true, organizationVerified: true, organizationName: "Metro EMS" },
  { id: "actor.responder-verification-offline", displayName: "Metro EMS Credential Pending", role: "emergency_responder", identityVerified: null, organizationVerified: null, organizationName: "Metro EMS" },
  { id: "actor.dr-lena-chen", displayName: "Dr. Lena Chen", role: "hospital_staff", identityVerified: true, organizationVerified: true, organizationName: "Article Zero Hospital" },
  { id: "actor.avery-cole", displayName: "Avery Cole", role: "privacy_officer", identityVerified: true, organizationVerified: true, organizationName: "Article Zero Hospital" },
  { id: "actor.unknown", displayName: "Unidentified requester", role: "unknown", identityVerified: null, organizationVerified: null, organizationName: null },
] as const satisfies readonly ActorContext[];

export const FAKE_RESPONDER = ACTORS[0];
export const METRO_EMS_17 = ACTORS[1];
export const RESPONDER_VERIFICATION_OFFLINE = ACTORS[2];
export const DR_LENA_CHEN = ACTORS[3];
export const AVERY_COLE = ACTORS[4];
export const UNKNOWN_ACTOR = ACTORS[5];
