import { describe, expect, it } from "vitest";

import {
  HERO_ATTACK_SCENARIO,
  LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO,
} from "../../../src/hospital/fixtures/scenarios";
import { PATIENT_FIELDS } from "../../../src/domain/catalogs";

describe("synthetic hospital fixtures", () => {
  it("keeps the hero request exact and fully populated", () => {
    expect(HERO_ATTACK_SCENARIO.id).toBe("scenario.fake-responder-full-record");
    expect(HERO_ATTACK_SCENARIO.requestText).toContain(
      "This is Jordan Vale with emergency response.",
    );
    expect(HERO_ATTACK_SCENARIO.fallbackAction.requestedFields).toEqual(
      PATIENT_FIELDS,
    );
  });

  it("defines the legitimate minimum-disclosure control", () => {
    expect(LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.id).toBe(
      "scenario.verified-responder-minimum-record",
    );
    expect(LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.fallbackAction.requestedFields).toEqual(
      PATIENT_FIELDS,
    );
  });
});
