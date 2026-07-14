import type { AiProvider } from "../ai/types";
import { AgentActionSchema, AttackRunSchema } from "../domain/schemas";
import type { AgentAction, AttackRun, AttackScenario, PolicyBundle } from "../domain/schemas";
import { executeEnforcedAction } from "../hospital/enforcement-gateway";
import type { HospitalToolGateway } from "../hospital/in-memory-tools";
import type { FrozenAttack } from "./freeze-replay";

export interface AttackPlanner {
  planAction: Pick<AiProvider, "planAction">["planAction"];
}

export async function runAttack(input: { readonly scenario: AttackScenario; readonly bundle: PolicyBundle; readonly constitutionVersionId: string; readonly gateway: HospitalToolGateway; readonly frozen?: FrozenAttack; readonly planner?: AttackPlanner; readonly now: () => Date; readonly idFactory: () => string }): Promise<AttackRun> {
  const startedAt = input.now().toISOString();
  let action: AgentAction;
  let requestText: string;
  let actionSource: AttackRun["actionSource"];
  if (input.frozen !== undefined) {
    if (input.frozen.scenarioId !== input.scenario.id) throw new Error("Frozen attack belongs to a different scenario.");
    action = AgentActionSchema.parse(input.frozen.action);
    requestText = input.frozen.requestText;
    actionSource = "frozen_replay";
  } else if (input.planner !== undefined) {
    requestText = input.scenario.requestText;
    const planned = await input.planner.planAction({ requestText, actor: input.scenario.evaluationContext.actor, patientId: input.scenario.patientId, allowedTools: [input.scenario.fallbackAction.tool] });
    action = AgentActionSchema.parse({ ...planned.data, actorId: input.scenario.actorId, patientId: input.scenario.patientId, sourceRequest: requestText });
    actionSource = planned.meta.source;
  } else {
    requestText = input.scenario.requestText;
    action = AgentActionSchema.parse(input.scenario.fallbackAction);
    actionSource = "fallback";
  }
  const result = await executeEnforcedAction({ action, context: input.scenario.evaluationContext, bundle: input.bundle, gateway: input.gateway, now: input.now, idFactory: input.idFactory });
  return AttackRunSchema.parse({ id: `attack.${input.idFactory()}`, scenarioId: input.scenario.id, constitutionVersionId: input.constitutionVersionId, startedAt, completedAt: input.now().toISOString(), requestText, action: result.action, actionSource, decision: result.decision, toolResult: result.toolResult });
}
