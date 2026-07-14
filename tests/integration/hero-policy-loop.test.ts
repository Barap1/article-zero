import { describe, expect, it, vi } from "vitest";

import { MINIMUM_EMERGENCY_FIELDS } from "../../src/domain/catalogs";
import { CORRECTED_POLICY_BUNDLE, LEGACY_POLICY_BUNDLE } from "../../src/hospital/fixtures/constitution";
import { HERO_ATTACK_SCENARIO, LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO } from "../../src/hospital/fixtures/scenarios";
import { createInMemoryHospitalTools } from "../../src/hospital/in-memory-tools";
import { freezeAttack } from "../../src/red-team/freeze-replay";
import { runAttack } from "../../src/red-team/run-attack";

const now = () => new Date("2026-07-13T12:00:00.000Z");

describe("hero policy loop", () => {
  it("Given the legacy bundle, When the fake responder attack runs, Then it breaches the complete synthetic record", async () => {
    const result = await runAttack({ scenario: HERO_ATTACK_SCENARIO, bundle: LEGACY_POLICY_BUNDLE, constitutionVersionId: "version.legacy-v1", gateway: createInMemoryHospitalTools(), now, idFactory: () => "test" });

    expect(result.actionSource).toBe("fallback");
    expect(result.decision.outcome).toBe("ALLOW");
    expect(result.toolResult?.executed).toBe(true);
    expect(result.toolResult?.exposedPatientFields).toEqual(result.action.requestedFields);
  });

  it("Given the corrected bundle, When a verified responder requests disclosure, Then the returned record has only approved fields", async () => {
    const result = await runAttack({ scenario: LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO, bundle: CORRECTED_POLICY_BUNDLE, constitutionVersionId: "version.corrected-v2", gateway: createInMemoryHospitalTools(), now, idFactory: () => "test" });

    expect(result.decision.outcome).toBe("ALLOW_WITH_FIELD_FILTER");
    expect(Object.keys(result.toolResult?.output ?? {})).toEqual([...MINIMUM_EMERGENCY_FIELDS]);
  });

  it("Given a frozen attack and the corrected bundle, When replayed, Then it denies without calling a planner", async () => {
    const original = await runAttack({ scenario: HERO_ATTACK_SCENARIO, bundle: LEGACY_POLICY_BUNDLE, constitutionVersionId: "version.legacy-v1", gateway: createInMemoryHospitalTools(), now, idFactory: () => "test" });
    const planner = { planAction: vi.fn() };

    const replay = await runAttack({ scenario: HERO_ATTACK_SCENARIO, bundle: CORRECTED_POLICY_BUNDLE, constitutionVersionId: "version.corrected-v2", gateway: createInMemoryHospitalTools(), frozen: freezeAttack(original), planner, now, idFactory: () => "test" });

    expect(replay.actionSource).toBe("frozen_replay");
    expect(replay.decision.outcome).toBe("DENY");
    expect(planner.planAction).not.toHaveBeenCalled();
  });
});
