import "server-only";

import { PolicyRuleSchema } from "../domain/schemas";
import { CORRECTED_POLICY_BUNDLE } from "../hospital/fixtures/constitution";
import { ATTACK_SCENARIOS } from "../hospital/fixtures/scenarios";
import { ProviderError } from "./errors";
import type { AiProvider, AiResult } from "./types";

const FREEFORM_AI_UNAVAILABLE = "Freeform AI compilation and revision are unavailable because GROQ_API_KEY is not configured. You can continue by editing structured policy controls manually, or configure Groq for freeform proposals.";

const vulnerableRule = PolicyRuleSchema.parse({
  id: "rule.emergency.vulnerable-override",
  sourceClauseId: "clause.emergency-response",
  name: "Emergency responder override",
  description: "Allow declared emergency responders to override privacy during an imminent emergency.",
  priority: 90,
  appliesToTools: ["disclose_patient_data"],
  conditionMode: "ALL",
  conditions: [
    { id: "condition.vulnerable.role", fact: "actor.role", operator: "EQUALS", value: "emergency_responder", label: "Actor declares the emergency responder role" },
    { id: "condition.vulnerable.imminent", fact: "emergency.imminent", operator: "EQUALS", value: true, label: "Emergency is described as imminent" },
  ],
  effect: "ALLOW",
  allowedFields: [],
  onIndeterminate: "DENY",
  overridesRuleIds: ["rule.privacy.default-deny"],
  severity: "critical",
  enabled: true,
});

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function heroAmendment(text: string): boolean {
  const normalized = normalize(text);
  return ["verified", "credible", "imminent", "life", "minimum"].every((term) => normalized.includes(term));
}

function fallbackResult<T>(requestId: string, data: T): AiResult<T> {
  return { data, meta: { requestId, model: "limited-sample-fallback", durationMs: 0, source: "fallback" } };
}

export class FallbackAiProvider implements AiProvider {
  public async compileClause(input: Parameters<AiProvider["compileClause"]>[0]) {
    const normalizedClause = normalize(input.clause.text);
    if (input.clause.id === "clause.emergency-response" && normalizedClause.includes("requests from emergency responders may override normal privacy restrictions")) {
      return fallbackResult(`fallback.compile.${input.clause.id}`, { sourceClauseId: input.clause.id, normalizedClause, interpretationSummary: "Sample emergency baseline compiled with the limited offline fallback.", rules: [vulnerableRule], ambiguities: [], assumptions: [] });
    }
    if (input.clause.id === "clause.emergency-response" && heroAmendment(input.clause.text)) {
      return fallbackResult(`fallback.compile.${input.clause.id}`, { sourceClauseId: input.clause.id, normalizedClause, interpretationSummary: "Sample emergency repair compiled with the limited offline fallback.", rules: [...CORRECTED_POLICY_BUNDLE.rules], ambiguities: [], assumptions: [] });
    }
    throw new ProviderError("PROVIDER_CONFIGURATION", FREEFORM_AI_UNAVAILABLE, false);
  }

  public async revisePolicy(input: Parameters<AiProvider["revisePolicy"]>[0]) {
    const isSampleRevision = input.selectedRules.some((rule) => rule.id === "rule.legacy-emergency-responder-override")
      && input.instruction.toLowerCase().includes("verified identity");
    if (!isSampleRevision) throw new ProviderError("PROVIDER_CONFIGURATION", FREEFORM_AI_UNAVAILABLE, false);
    return fallbackResult("fallback.revise.hero-rule", { sourceRuleIds: input.selectedRules.map((rule) => rule.id), instruction: input.instruction, revisedRules: [...CORRECTED_POLICY_BUNDLE.rules], changeSummary: "Requires verified responder identity and organization, credible imminent threat to life, and minimum emergency fields.", warnings: [] });
  }

  public async planAction(input: Parameters<AiProvider["planAction"]>[0]) {
    const scenario = ATTACK_SCENARIOS.find((candidate) => candidate.requestText === input.requestText && candidate.actorId === input.actor.id && candidate.patientId === input.patientId);
    if (scenario === undefined || !input.allowedTools.includes(scenario.fallbackAction.tool)) {
      throw new ProviderError("PROVIDER_INVALID_OUTPUT", "No deterministic planner fallback exists for this request.", false);
    }
    return fallbackResult(`fallback.plan.${scenario.id}`, scenario.fallbackAction);
  }

  public async generateAttackVariation(input: Parameters<AiProvider["generateAttackVariation"]>[0]) {
    return fallbackResult(`fallback.variation.${input.scenario.id}`, { requestText: `Urgency variation: ${input.scenario.requestText}` });
  }
}
