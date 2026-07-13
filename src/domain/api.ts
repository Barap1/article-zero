import { z } from "zod"

import {
  ActorContextSchema,
  AgentActionSchema,
  CompilePreviewSchema,
  ConstitutionClauseSchema,
  PolicyBundleSchema,
  PolicyRuleSchema,
  RevisionPreviewSchema,
} from "./schemas"

export const ApiSourceSchema = z.enum(["deterministic", "groq", "fallback"])
export const ApiSuccessMetaSchema = z.strictObject({
  requestId: z.string(),
  durationMs: z.number().nonnegative(),
  source: ApiSourceSchema,
})
export const ApiErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_INVALID_OUTPUT",
  "POLICY_INVALID",
  "ACTION_DENIED",
  "INTERNAL_ERROR",
])
export const ApiFailureSchema = z.strictObject({
  ok: z.literal(false),
  error: z.strictObject({
    code: ApiErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
    requestId: z.string(),
  }),
})

export const CompileRequestSchema = z.strictObject({ clause: ConstitutionClauseSchema, existingBundle: PolicyBundleSchema })
export const RevisionRequestSchema = z.strictObject({
  instruction: z.string().min(1),
  selectedRuleIds: z.array(z.string()),
  selectedRules: z.array(PolicyRuleSchema),
  existingBundle: PolicyBundleSchema,
})
export const PlanActionRequestSchema = z.strictObject({
  scenarioId: z.string(),
  requestText: z.string().min(1),
  actor: ActorContextSchema,
  patientId: z.string(),
})
export const AttackVariationRequestSchema = z.strictObject({ scenarioId: z.string(), variationSeed: z.number().int() })
export const HealthDataSchema = z.strictObject({
  status: z.enum(["ok", "degraded"]),
  groqConfigured: z.boolean(),
  fallbackEnabled: z.boolean(),
  policyModel: z.string(),
  fastModel: z.string(),
})
export const AttackVariationDataSchema = z.strictObject({ requestText: z.string() })

export const CompilePreviewResponseSchema = z.strictObject({ ok: z.literal(true), data: CompilePreviewSchema, meta: ApiSuccessMetaSchema })
export const RevisionPreviewResponseSchema = z.strictObject({ ok: z.literal(true), data: RevisionPreviewSchema, meta: ApiSuccessMetaSchema })
export const AgentActionResponseSchema = z.strictObject({ ok: z.literal(true), data: AgentActionSchema, meta: ApiSuccessMetaSchema })
export const AttackVariationResponseSchema = z.strictObject({ ok: z.literal(true), data: AttackVariationDataSchema, meta: ApiSuccessMetaSchema })
export const HealthResponseSchema = z.strictObject({ ok: z.literal(true), data: HealthDataSchema, meta: ApiSuccessMetaSchema })

export { AgentActionSchema, CompilePreviewSchema, RevisionPreviewSchema }

export type ApiSource = z.infer<typeof ApiSourceSchema>
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>
