import { expect, it } from "vitest";

import { HERO_ATTACK_SCENARIO, LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO } from "../../../src/hospital/fixtures/scenarios";
import { createInMemoryHospitalTools } from "../../../src/hospital/in-memory-tools";
import { runAttack } from "../../../src/red-team/run-attack";
import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { getWorkflowAvailability } from "../../../src/workspace/workflow-availability";

async function attackRun(scenario: typeof HERO_ATTACK_SCENARIO, versionId: string, bundle: Parameters<typeof runAttack>[0]["bundle"]) {
  return runAttack({ scenario, bundle, constitutionVersionId: versionId, gateway: createInMemoryHospitalTools(), now: () => new Date("2026-07-13T12:00:00.000Z"), idFactory: () => "workflow-test" });
}

it("keeps the sample entry stages available and explains blocked later stages", () => {
  const availability = getWorkflowAvailability(createSeedWorkspace());

  expect(availability.CONSTITUTION.available).toBe(true);
  expect(availability.ATTACK.available).toBe(true);
  expect(availability.INCIDENT).toMatchObject({ available: false, reason: "Run a synthetic request in Attack first." });
  expect(availability.AMENDMENT).toMatchObject({ available: false, reason: "Run a request, then open its incident." });
  expect(availability.TESTING).toMatchObject({ available: false, reason: "Compile an edited draft before testing." });
  expect(availability.REPLAY).toMatchObject({ available: false, reason: "Activate a tested version before replay." });
  expect(availability.COMPLETE).toMatchObject({ available: false, reason: "Run both required replay controls first." });
});

it("marks completed prerequisites without blocking revisits", async () => {
  const seed = createSeedWorkspace();
  const active = seed.versions.find((version) => version.id === seed.activeVersionId);
  if (active === undefined) throw new Error("Seed active version missing.");

  const legacyRun = await attackRun(HERO_ATTACK_SCENARIO, active.id, active.policyBundle);
  const nextState = { ...seed, attackRuns: [legacyRun], selectedAttackRunId: legacyRun.id };
  const availability = getWorkflowAvailability(nextState);

  expect(availability.ATTACK.complete).toBe(true);
  expect(availability.INCIDENT.available).toBe(true);
  expect(availability.AMENDMENT.available).toBe(true);
  expect(availability.CONSTITUTION.available).toBe(true);

  const legitimateRun = await attackRun(LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO, active.id, active.policyBundle);
  expect(getWorkflowAvailability({ ...nextState, attackRuns: [legacyRun, legitimateRun] }).COMPLETE.available).toBe(false);
});
