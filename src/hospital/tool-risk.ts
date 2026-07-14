import type { ToolName } from "../domain/catalogs";
import type { AgentAction, PolicyBundle, PolicyDecision } from "../domain/schemas";

export const PROTECTED_TOOL_NAMES = ["read_patient_record", "disclose_patient_data", "send_staff_message", "trigger_emergency_alert"] as const satisfies readonly ToolName[];

export function isProtectedTool(tool: ToolName): boolean {
  return PROTECTED_TOOL_NAMES.some((protectedTool) => protectedTool === tool);
}

export function isToolExecutionAuthorized(input: { readonly action: AgentAction; readonly decision: PolicyDecision; readonly bundle: PolicyBundle }): boolean {
  return !isProtectedTool(input.action.tool) || (input.decision.toolExecutionPermitted && input.decision.actionId === input.action.id && input.decision.bundleId === input.bundle.bundleId);
}
