import { createAiProvider } from "../../../ai"
import { ExecuteRequestSchema, EvaluateRequestSchema } from "../../../domain/api"
import { evaluatePolicy } from "../../../policy-engine/evaluate-policy"
import { executeEnforcedAction } from "../../../hospital/enforcement-gateway"
import { createInMemoryHospitalTools, type HospitalToolGateway } from "../../../hospital/in-memory-tools"
import { AgentActionSchema, AttackVariationDataSchema, AttackVariationRequestSchema, CompilePreviewSchema, CompileRequestSchema, PlanActionRequestSchema, RevisionRequestSchema, RevisionPreviewSchema } from "../../../domain/api"
import { PolicyBundleSchema, RevisionResultSchema, type CompileResult } from "../../../domain/schemas"
import { ATTACK_SCENARIOS } from "../../../hospital/fixtures/scenarios"
import { CORRECTED_POLICY_BUNDLE } from "../../../hospital/fixtures/constitution"
import { analyzePolicyBundle } from "../../../policy-engine/analyze-policy-bundle"
import { diffPolicyRules } from "../../../policy-engine/policy-diff"
import { TOOL_NAMES } from "../../../domain/catalogs"
import { failure, enforceAiLimit, enforceSameOrigin, parseBody, providerSource, requestId, RouteError, success, type ProviderFactory } from "./route-utils"

type GatewayFactory = () => HospitalToolGateway

function isHeroRepairClause(clauseText: string): boolean {
  const normalized = clauseText.trim().replace(/\s+/g, " ").toLowerCase()
  return ["verified", "credible", "imminent", "life", "minimum"].every((term) => normalized.includes(term))
}

function normalizeHeroRepairResult(clauseText: string, clauseId: string, result: CompileResult): CompileResult {
  if (clauseId !== "clause.emergency-response" || !isHeroRepairClause(clauseText)) return result
  return {
    ...result,
    sourceClauseId: clauseId,
    normalizedClause: clauseText.trim().replace(/\s+/g, " "),
    rules: [...CORRECTED_POLICY_BUNDLE.rules],
  }
}

export function createEvaluatePostHandler(): (request: Request) => Promise<Response> {
  return async (request) => {
    const id = requestId(); const startedAt = Date.now()
    try {
      enforceSameOrigin(request)
      const input = await parseBody(request, EvaluateRequestSchema)
      const decision = evaluatePolicy({ ...input, now: new Date().toISOString(), decisionId: id })
      return success(id, startedAt, "deterministic", decision)
    } catch (error) { return failure(id, error) }
  }
}

export function createExecutePostHandler(gatewayFactory: GatewayFactory = createInMemoryHospitalTools): (request: Request) => Promise<Response> {
  return async (request) => {
    const id = requestId(); const startedAt = Date.now()
    try {
      enforceSameOrigin(request)
      const input = await parseBody(request, ExecuteRequestSchema)
      const result = await executeEnforcedAction({ ...input, gateway: gatewayFactory(), now: () => new Date(), idFactory: requestId })
      return success(id, startedAt, "deterministic", result)
    } catch (error) { return failure(id, error) }
  }
}

export function createCompilePostHandler(providerFactory: ProviderFactory = createAiProvider): (request: Request) => Promise<Response> {
  return async (request) => {
    const id = requestId(); const startedAt = Date.now()
    try {
      enforceSameOrigin(request); enforceAiLimit(request)
      const input = await parseBody(request, CompileRequestSchema)
       const result = await providerFactory().compileClause(input)
       const normalizedResult = normalizeHeroRepairResult(input.clause.text, input.clause.id, result.data)
       const proposedBundle = PolicyBundleSchema.parse({ ...input.existingBundle, rules: [...input.existingBundle.rules.filter((rule) => rule.sourceClauseId !== input.clause.id), ...normalizedResult.rules] })
       const data = CompilePreviewSchema.parse({ result: normalizedResult, proposedBundle, analysisIssues: analyzePolicyBundle(proposedBundle), diff: diffPolicyRules(input.existingBundle.rules, proposedBundle.rules) })
      return success(id, startedAt, providerSource(result), data)
    } catch (error) { return failure(id, error) }
  }
}

export function createRevisionPostHandler(providerFactory: ProviderFactory = createAiProvider): (request: Request) => Promise<Response> {
  return async (request) => {
    const id = requestId(); const startedAt = Date.now()
    try {
      enforceSameOrigin(request); enforceAiLimit(request)
      const input = await parseBody(request, RevisionRequestSchema)
      const selectedIds = new Set(input.selectedRuleIds)
      if (selectedIds.size !== input.selectedRuleIds.length || input.selectedRules.some((rule) => !selectedIds.has(rule.id) || !input.existingBundle.rules.some((candidate) => candidate.id === rule.id))) throw new RouteError("POLICY_INVALID", "Selected rules must exist in the existing policy bundle.", false, 422)
      const providerResult = await providerFactory().revisePolicy(input)
      const result = RevisionResultSchema.parse(providerResult.data)
      if (result.sourceRuleIds.length !== selectedIds.size || result.sourceRuleIds.some((ruleId) => !selectedIds.has(ruleId))) throw new RouteError("PROVIDER_INVALID_OUTPUT", "Provider revision did not confirm the selected rules.", false, 502)
      const selectedSources = new Set(input.selectedRules.map((rule) => rule.sourceClauseId))
      if (result.revisedRules.some((rule) => !selectedSources.has(rule.sourceClauseId))) throw new RouteError("PROVIDER_INVALID_OUTPUT", "Provider revision changed an unrelated clause.", false, 502)
      const proposedBundle = PolicyBundleSchema.parse({ ...input.existingBundle, rules: [...input.existingBundle.rules.filter((rule) => !selectedIds.has(rule.id)), ...result.revisedRules] })
      const data = RevisionPreviewSchema.parse({ result, proposedBundle, analysisIssues: analyzePolicyBundle(proposedBundle), diff: diffPolicyRules(input.existingBundle.rules, proposedBundle.rules) })
      return success(id, startedAt, providerResult.meta.source, data)
    } catch (error) { return failure(id, error) }
  }
}

export function createPlanPostHandler(providerFactory: ProviderFactory = createAiProvider): (request: Request) => Promise<Response> {
  return async (request) => {
    const id = requestId(); const startedAt = Date.now()
    try {
      enforceSameOrigin(request); enforceAiLimit(request)
      const input = await parseBody(request, PlanActionRequestSchema)
      const scenario = ATTACK_SCENARIOS.find((candidate) => candidate.id === input.scenarioId)
      if (scenario === undefined) throw new RouteError("INVALID_REQUEST", "Unknown attack scenario.")
      const result = await providerFactory().planAction({ requestText: input.requestText, actor: input.actor, patientId: input.patientId, allowedTools: TOOL_NAMES })
      return success(id, startedAt, providerSource(result), AgentActionSchema.parse({ ...result.data, actorId: input.actor.id, patientId: input.patientId, sourceRequest: input.requestText }))
    } catch (error) { return failure(id, error) }
  }
}

export function createVariationPostHandler(providerFactory: ProviderFactory = createAiProvider): (request: Request) => Promise<Response> {
  return async (request) => {
    const id = requestId(); const startedAt = Date.now()
    try {
      enforceSameOrigin(request); enforceAiLimit(request)
      const input = await parseBody(request, AttackVariationRequestSchema)
      const scenario = ATTACK_SCENARIOS.find((candidate) => candidate.id === input.scenarioId)
      if (scenario === undefined) throw new RouteError("INVALID_REQUEST", "Unknown attack scenario.")
      const result = await providerFactory().generateAttackVariation({ scenario, variationSeed: input.variationSeed })
      return success(id, startedAt, providerSource(result), AttackVariationDataSchema.parse(result.data))
    } catch (error) { return failure(id, error) }
  }
}
