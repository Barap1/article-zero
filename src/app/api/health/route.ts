import { readGroqConfiguration } from "../../../ai/groq-client"
import { HealthDataSchema } from "../../../domain/api"
import { failure, requestId, success } from "../_lib/route"

export function GET(): Response {
  const id = requestId(); const startedAt = Date.now()
  try {
    const configuration = readGroqConfiguration()
    const data = HealthDataSchema.parse({ status: configuration.apiKey === undefined && !configuration.demoFallbacksEnabled ? "degraded" : "ok", groqConfigured: configuration.apiKey !== undefined, fallbackEnabled: configuration.demoFallbacksEnabled, policyModel: configuration.policyModel, fastModel: configuration.fastModel })
    return success(id, startedAt, "deterministic", data)
  } catch (error) { return failure(id, error) }
}
