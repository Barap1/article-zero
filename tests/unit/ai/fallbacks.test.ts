import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { FallbackAiProvider } from "../../../src/ai/fallback-provider";
import { LEGACY_POLICY_BUNDLE, SEED_CLAUSES } from "../../../src/hospital/fixtures/constitution";
import { HERO_ATTACK_SCENARIO } from "../../../src/hospital/fixtures/scenarios";
import { analyzePolicyBundle } from "../../../src/policy-engine/analyze-policy-bundle";

describe("FallbackAiProvider", () => {
  it("Given the legacy seed clause, When compiled, Then returns the exact vulnerable specification rule with fallback metadata", async () => {
    const provider = new FallbackAiProvider();

    const result = await provider.compileClause({ clause: SEED_CLAUSES[2]!, existingBundle: LEGACY_POLICY_BUNDLE });

    expect(result.meta).toMatchObject({ source: "fallback", model: "deterministic-fallback" });
    expect(result.data.rules[0]).toMatchObject({
      id: "rule.emergency.vulnerable-override",
      effect: "ALLOW",
      allowedFields: [],
      overridesRuleIds: ["rule.privacy.default-deny"],
    });
  });

  it("Given the hero amendment, When compiled, Then returns the exact verified minimum-disclosure rule", async () => {
    const provider = new FallbackAiProvider();
    const correctedClause = {
      ...SEED_CLAUSES[2]!,
      text: "Require verified responders, credible imminent threats to life, and only minimum emergency fields.",
    };

    const result = await provider.compileClause({ clause: correctedClause, existingBundle: LEGACY_POLICY_BUNDLE });

    expect(result.data.rules[0]).toMatchObject({
      id: "rule.emergency.verified-minimum-disclosure",
      effect: "ALLOW_WITH_FIELD_FILTER",
      onIndeterminate: "REQUIRE_HUMAN_APPROVAL",
      allowedFields: ["fullName", "bloodType", "criticalAllergies", "currentEmergencyMedications", "emergencyWarningFlags"],
    });
    expect(analyzePolicyBundle({ ...LEGACY_POLICY_BUNDLE, rules: result.data.rules })).toEqual([]);
  });

  it("Given the hero attack, When planned, Then returns the scenario fallback action exactly", async () => {
    const provider = new FallbackAiProvider();

    const result = await provider.planAction({
      requestText: HERO_ATTACK_SCENARIO.requestText,
      actor: HERO_ATTACK_SCENARIO.evaluationContext.actor,
      patientId: HERO_ATTACK_SCENARIO.patientId,
      allowedTools: ["disclose_patient_data"],
    });

    expect(result.data).toEqual(HERO_ATTACK_SCENARIO.fallbackAction);
    expect(result.meta.source).toBe("fallback");
  });

  it("Given a scenario, When generating a variation, Then returns its stable urgency-prefixed request", async () => {
    const provider = new FallbackAiProvider();

    const result = await provider.generateAttackVariation({ scenario: HERO_ATTACK_SCENARIO, variationSeed: 12 });

    expect(result.data.requestText).toBe(`Urgency variation: ${HERO_ATTACK_SCENARIO.requestText}`);
    expect(result.meta.source).toBe("fallback");
  });
});
