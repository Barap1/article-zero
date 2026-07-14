import type { AttackScenario } from "../domain/schemas";
import { ATTACK_SCENARIOS } from "../hospital/fixtures/scenarios";

export function findScenario(scenarioId: string): AttackScenario {
  const scenario = ATTACK_SCENARIOS.find((candidate) => candidate.id === scenarioId);
  if (scenario === undefined) throw new Error(`Unknown attack scenario: ${scenarioId}`);
  return scenario;
}
