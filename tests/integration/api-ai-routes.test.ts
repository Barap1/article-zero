// @vitest-environment node

import { describe, expect, it } from "vitest"

import { ProviderError } from "../../src/ai/errors"
import type { AiProvider } from "../../src/ai/types"
import { GET } from "../../src/app/api/health/route"
import { createPlanPostHandler as createPlanHandler, createVariationPostHandler as createVariationHandler } from "../../src/app/api/_lib/handlers"
import { AgentActionResponseSchema, ApiFailureSchema, AttackVariationResponseSchema, HealthResponseSchema } from "../../src/domain/api"
import { FAKE_RESPONDER } from "../../src/hospital/fixtures/actors"
import { HERO_ATTACK_SCENARIO } from "../../src/hospital/fixtures/scenarios"

function post(url: string, body: unknown): Request {
  return new Request(`http://localhost${url}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": crypto.randomUUID() }, body: JSON.stringify(body) })
}

const provider = {
  async compileClause() { throw new Error("unused") },
  async revisePolicy() { throw new Error("unused") },
  async planAction() {
    return { data: { ...HERO_ATTACK_SCENARIO.fallbackAction, actorId: "attacker", patientId: "wrong-patient", sourceRequest: "wrong-request" }, meta: { requestId: "fake.plan", model: "fake", durationMs: 0, source: "groq" } }
  },
  async generateAttackVariation() {
    return { data: { requestText: "Synthetic variation" }, meta: { requestId: "fake.variation", model: "fake", durationMs: 0, source: "fallback" } }
  },
} satisfies AiProvider

describe("AI route handlers", () => {
  it("forces planner identity fields from the validated request", async () => {
    const handler = createPlanHandler(() => provider)
    const response = await handler(post("/api/plan-action", { scenarioId: HERO_ATTACK_SCENARIO.id, requestText: "trusted request", actor: FAKE_RESPONDER, patientId: "patient.synthetic" }))
    const body = AgentActionResponseSchema.parse(await response.json())

    expect(body.data.actorId).toBe(FAKE_RESPONDER.id)
    expect(body.data.patientId).toBe("patient.synthetic")
    expect(body.data.sourceRequest).toBe("trusted request")
  })

  it("returns variation fallback metadata", async () => {
    const handler = createVariationHandler(() => provider)
    const response = await handler(post("/api/generate-attack-variation", { scenarioId: HERO_ATTACK_SCENARIO.id, variationSeed: 4 }))
    const body = AttackVariationResponseSchema.parse(await response.json())

    expect(body.meta.source).toBe("fallback")
    expect(body.data.requestText).toBe("Synthetic variation")
  })

  it("reports configured provider status without calling Groq", async () => {
    const previous = process.env["GROQ_API_KEY"]
    process.env["GROQ_API_KEY"] = "test-key"
    const response = GET()
    if (previous === undefined) delete process.env["GROQ_API_KEY"]
    else process.env["GROQ_API_KEY"] = previous

    const body = HealthResponseSchema.parse(await response.json())
    expect(body.data.groqConfigured).toBe(true)
    expect(body.data.status).toBe("ok")
  })

  it("maps provider failures to the standard error envelope", async () => {
    const failingProvider: AiProvider = {
      ...provider,
      async generateAttackVariation() { throw new ProviderError("PROVIDER_RATE_LIMIT", "provider busy", true) },
    }
    const handler = createVariationHandler(() => failingProvider)
    const response = await handler(post("/api/generate-attack-variation", { scenarioId: HERO_ATTACK_SCENARIO.id, variationSeed: 4 }))
    const body = ApiFailureSchema.parse(await response.json())

    expect(response.status).toBe(429)
    expect(body.error.code).toBe("PROVIDER_RATE_LIMITED")
    expect(body.error.retryable).toBe(true)
  })
})
