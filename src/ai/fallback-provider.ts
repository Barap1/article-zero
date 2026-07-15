import "server-only";

import { BREAK_GLASS_EMERGENCY_FIELDS, MINIMUM_EMERGENCY_FIELDS } from "../domain/catalogs";
import { PolicyRuleSchema } from "../domain/schemas";
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

const correctedRule = PolicyRuleSchema.parse({
  id: "rule.emergency.verified-minimum-disclosure",
  sourceClauseId: "clause.emergency-response",
  name: "Verified minimum emergency disclosure",
  description: "Permit only minimum emergency fields when identity, organization, credibility, imminence, and threat-to-life conditions are verified.",
  priority: 90,
  appliesToTools: ["disclose_patient_data"],
  conditionMode: "ALL",
  conditions: [
    { id: "condition.corrected.role", fact: "actor.role", operator: "EQUALS", value: "emergency_responder", label: "Actor role is emergency responder" },
    { id: "condition.corrected.identity", fact: "actor.identityVerified", operator: "EQUALS", value: true, label: "Responder identity is verified" },
    { id: "condition.corrected.organization", fact: "actor.organizationVerified", operator: "EQUALS", value: true, label: "Responder organization is verified" },
    { id: "condition.corrected.credible", fact: "emergency.credible", operator: "EQUALS", value: true, label: "Emergency evidence is credible" },
    { id: "condition.corrected.imminent", fact: "emergency.imminent", operator: "EQUALS", value: true, label: "Threat is imminent" },
    { id: "condition.corrected.life", fact: "emergency.threatToLife", operator: "EQUALS", value: true, label: "Threat concerns human life" },
  ],
  effect: "ALLOW_WITH_FIELD_FILTER",
  allowedFields: [...MINIMUM_EMERGENCY_FIELDS],
  onIndeterminate: "REQUIRE_HUMAN_APPROVAL",
  overridesRuleIds: [],
  severity: "critical",
  enabled: true,
});

const approvedBreakGlassRule = PolicyRuleSchema.parse({
  id: "rule.emergency.approved-break-glass-disclosure",
  sourceClauseId: "clause.emergency-response",
  name: "Privacy-officer approved break-glass disclosure",
  description: "A verified-dispatch emergency with unavailable responder credentials may disclose minimum fields after privacy-officer approval.",
  priority: 92,
  appliesToTools: ["disclose_patient_data"],
  conditionMode: "ALL",
  conditions: [
    { id: "condition.approved.role", fact: "actor.role", operator: "EQUALS", value: "emergency_responder", label: "Actor role is emergency responder" },
    { id: "condition.approved.credible", fact: "emergency.credible", operator: "EQUALS", value: true, label: "Emergency evidence is credible" },
    { id: "condition.approved.imminent", fact: "emergency.imminent", operator: "EQUALS", value: true, label: "Threat is imminent" },
    { id: "condition.approved.life", fact: "emergency.threatToLife", operator: "EQUALS", value: true, label: "Threat concerns human life" },
    { id: "condition.approved.identity", fact: "actor.identityVerified", operator: "EQUALS", value: null, label: "Responder credential verification is unavailable" },
    { id: "condition.approved.evidence", fact: "emergency.evidenceSource", operator: "IN", value: ["verified_dispatch", "hospital_system"], label: "Emergency evidence comes from a trusted system" },
    { id: "condition.approved.purpose", fact: "request.purpose", operator: "EQUALS", value: "privacy_review", label: "Request is a privacy-officer review" },
    { id: "condition.approved.status", fact: "approval.status", operator: "EQUALS", value: "approved", label: "Privacy-officer approval is recorded" },
    { id: "condition.approved.approver", fact: "approval.approverRole", operator: "EQUALS", value: "privacy_officer", label: "Approval came from a privacy officer" },
  ],
  effect: "ALLOW_WITH_FIELD_FILTER",
  allowedFields: [...BREAK_GLASS_EMERGENCY_FIELDS],
  onIndeterminate: "REQUIRE_HUMAN_APPROVAL",
  overridesRuleIds: ["rule.emergency.verified-minimum-disclosure"],
  severity: "high",
  enabled: true,
});

const trustedBreakGlassRule = PolicyRuleSchema.parse({
  id: "rule.emergency.trusted-credential-outage-disclosure",
  sourceClauseId: "clause.emergency-response",
  name: "Trusted credential-outage break-glass disclosure",
  description: "A verified-dispatch emergency with unavailable credentials permits only narrow stabilization fields.",
  priority: 91,
  appliesToTools: ["disclose_patient_data"],
  conditionMode: "ALL",
  conditions: [
    { id: "condition.outage.role", fact: "actor.role", operator: "EQUALS", value: "emergency_responder", label: "Actor role is emergency responder" },
    { id: "condition.outage.credible", fact: "emergency.credible", operator: "EQUALS", value: true, label: "Emergency evidence is credible" },
    { id: "condition.outage.imminent", fact: "emergency.imminent", operator: "EQUALS", value: true, label: "Threat is imminent" },
    { id: "condition.outage.life", fact: "emergency.threatToLife", operator: "EQUALS", value: true, label: "Threat concerns human life" },
    { id: "condition.outage.identity", fact: "actor.identityVerified", operator: "EQUALS", value: null, label: "Responder credential verification is unavailable" },
    { id: "condition.outage.evidence", fact: "emergency.evidenceSource", operator: "IN", value: ["verified_dispatch", "hospital_system"], label: "Emergency evidence comes from a trusted system" },
    { id: "condition.outage.purpose", fact: "request.purpose", operator: "EQUALS", value: "emergency_response", label: "Request supports emergency response" },
  ],
  effect: "ALLOW_WITH_FIELD_FILTER",
  allowedFields: [...BREAK_GLASS_EMERGENCY_FIELDS],
  onIndeterminate: "REQUIRE_HUMAN_APPROVAL",
  overridesRuleIds: ["rule.emergency.verified-minimum-disclosure"],
  severity: "high",
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
      return fallbackResult(`fallback.compile.${input.clause.id}`, { sourceClauseId: input.clause.id, normalizedClause, interpretationSummary: "Sample emergency repair compiled with the limited offline fallback.", rules: [correctedRule, trustedBreakGlassRule, approvedBreakGlassRule], ambiguities: [], assumptions: [] });
    }
    throw new ProviderError("PROVIDER_CONFIGURATION", FREEFORM_AI_UNAVAILABLE, false);
  }

  public async revisePolicy(input: Parameters<AiProvider["revisePolicy"]>[0]) {
    const isSampleRevision = input.selectedRules.some((rule) => rule.id === "rule.legacy-emergency-responder-override")
      && input.instruction.toLowerCase().includes("verified identity");
    if (!isSampleRevision) throw new ProviderError("PROVIDER_CONFIGURATION", FREEFORM_AI_UNAVAILABLE, false);
    return fallbackResult("fallback.revise.hero-rule", { sourceRuleIds: input.selectedRules.map((rule) => rule.id), instruction: input.instruction, revisedRules: [correctedRule], changeSummary: "Requires verified responder identity and organization, credible imminent threat to life, and minimum emergency fields.", warnings: [] });
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
