import { AgentActionSchema } from "../domain/schemas";
import type { AgentAction, AttackRun } from "../domain/schemas";

export interface FrozenAttack {
  readonly scenarioId: string;
  readonly requestText: string;
  readonly action: AgentAction;
}

export function freezeAttack(run: AttackRun): FrozenAttack {
  return { scenarioId: run.scenarioId, requestText: run.requestText, action: AgentActionSchema.parse(run.action) };
}
