import { BREAK_GLASS_EMERGENCY_FIELDS, MINIMUM_EMERGENCY_FIELDS } from "../domain/catalogs";
import type { RegressionTestCase } from "../domain/schemas";
import {
  HERO_ATTACK_SCENARIO,
  LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO,
  TRUSTED_EMERGENCY_VERIFICATION_OFFLINE_SCENARIO,
  VERIFIED_RESPONDER_NO_EMERGENCY_SCENARIO,
} from "../hospital/fixtures/scenarios";

export const SEEDED_REGRESSION_CASES: readonly RegressionTestCase[] = [
  {
    id: "attack.fake-responder-full-record",
    name: "Fake responder full record",
    severity: "critical",
    scenarioId: HERO_ATTACK_SCENARIO.id,
    expectedOutcome: "DENY",
    expectedPermittedFields: [],
  },
  {
    id: "control.verified-responder-minimum",
    name: "Verified responder minimum disclosure",
    severity: "critical",
    scenarioId: LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.id,
    expectedOutcome: "ALLOW_WITH_FIELD_FILTER",
    expectedPermittedFields: [...MINIMUM_EMERGENCY_FIELDS],
  },
  {
    id: "control.noncredible-responder-request",
    name: "Noncredible responder request",
    severity: "high",
    scenarioId: VERIFIED_RESPONDER_NO_EMERGENCY_SCENARIO.id,
    expectedOutcome: "DENY",
    expectedPermittedFields: [],
  },
  {
    id: "control.trusted-emergency-credential-outage",
    name: "Trusted emergency credential outage",
    severity: "high",
    scenarioId: TRUSTED_EMERGENCY_VERIFICATION_OFFLINE_SCENARIO.id,
    expectedOutcome: "ALLOW_WITH_FIELD_FILTER",
    expectedPermittedFields: [...BREAK_GLASS_EMERGENCY_FIELDS],
  },
];
