"use client";

import { useCallback } from "react";

import type { AttackScenario, AuditEvent, PolicyBundle } from "../domain/schemas";
import { ApiClientError, apiClient } from "../lib/api-client";
import type { AgentAction, PolicyDecision, ToolExecutionResult } from "../domain/schemas";
import type { FrozenAttack } from "../red-team/freeze-replay";
import { useOperation } from "./use-operation";

export type RunAttackInput = {
  readonly scenario: AttackScenario;
  readonly requestText: string;
  readonly bundle: PolicyBundle;
  readonly frozen?: FrozenAttack;
};

export type AttackOperationResult = {
  readonly action: AgentAction;
  readonly source: "groq" | "fallback" | "frozen_replay";
  readonly decision: PolicyDecision;
  readonly toolResult: ToolExecutionResult | null;
  readonly auditEvents: readonly AuditEvent[];
};

function matchesScenarioAction(input: RunAttackInput, action: AgentAction): boolean {
  return action.tool === input.scenario.fallbackAction.tool
    && action.actorId === input.scenario.actorId
    && action.patientId === input.scenario.patientId
    && action.recipientId === input.scenario.actorId
    && action.purpose === input.scenario.fallbackAction.purpose
    && action.requestedFields.length === input.scenario.fallbackAction.requestedFields.length
    && action.requestedFields.every((field, index) => field === input.scenario.fallbackAction.requestedFields[index]);
}

function fallbackAction(input: RunAttackInput): AgentAction {
  return { ...input.scenario.fallbackAction, sourceRequest: input.requestText };
}

export function useRunAttack() {
  const operation = useCallback(async (input: RunAttackInput): Promise<AttackOperationResult> => {
    if (input.frozen !== undefined) {
      if (input.frozen.scenarioId !== input.scenario.id) throw new Error("Frozen attack belongs to a different scenario.");
      const execution = await apiClient.execute({ action: input.frozen.action, context: input.scenario.evaluationContext, bundle: input.bundle });
      return { action: execution.data.action, source: "frozen_replay", decision: execution.data.decision, toolResult: execution.data.toolResult, auditEvents: execution.data.auditEvents };
    }
    try {
      const plan = await apiClient.planAction({ scenarioId: input.scenario.id, requestText: input.requestText, actor: input.scenario.evaluationContext.actor, patientId: input.scenario.patientId });
      const action = matchesScenarioAction(input, plan.data) ? plan.data : fallbackAction(input);
      const execution = await apiClient.execute({ action, context: input.scenario.evaluationContext, bundle: input.bundle });
      return { action: execution.data.action, source: action === plan.data && plan.meta.source === "groq" ? "groq" : "fallback", decision: execution.data.decision, toolResult: execution.data.toolResult, auditEvents: execution.data.auditEvents };
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error;
      const action = fallbackAction(input);
      const execution = await apiClient.execute({ action, context: input.scenario.evaluationContext, bundle: input.bundle });
      return { action: execution.data.action, source: "fallback", decision: execution.data.decision, toolResult: execution.data.toolResult, auditEvents: execution.data.auditEvents };
    }
  }, []);
  return useOperation(operation);
}
