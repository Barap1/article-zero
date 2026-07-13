import type { FactKey } from "../domain/catalogs";
import type { AgentAction, ConditionExpectedValue, EvaluationContext } from "../domain/schemas";

function assertNever(value: never): never {
  throw new Error(`Unexpected fact key: ${String(value)}`);
}

export function resolveFact(
  fact: FactKey,
  action: AgentAction,
  context: EvaluationContext,
): ConditionExpectedValue {
  switch (fact) {
    case "actor.role":
      return context.actor.role;
    case "actor.identityVerified":
      return context.actor.identityVerified;
    case "actor.organizationVerified":
      return context.actor.organizationVerified;
    case "emergency.credible":
      return context.emergency.credible;
    case "emergency.imminent":
      return context.emergency.imminent;
    case "emergency.threatToLife":
      return context.emergency.threatToLife;
    case "emergency.evidenceSource":
      return context.emergency.evidenceSource;
    case "patient.id":
      return action.patientId;
    case "request.purpose":
      return action.purpose;
    case "request.requestedFields":
      return action.requestedFields;
    case "approval.status":
      return context.approval.status;
    case "approval.approverRole":
      return context.approval.approverRole;
    case "tool.name":
      return action.tool;
    default:
      return assertNever(fact);
  }
}
