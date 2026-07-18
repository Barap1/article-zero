// @vitest-environment node

import { describe, expect, it } from "vitest"

import { FallbackAiProvider } from "../../src/ai/fallback-provider"
import type { AiProvider } from "../../src/ai/types"
import { POST } from "../../src/app/api/compile/route"
import { createCompilePostHandler } from "../../src/app/api/_lib/handlers"
import { CompilePreviewResponseSchema, ApiFailureSchema } from "../../src/domain/api"
import { CORRECTED_POLICY_BUNDLE, SEED_CLAUSES, LEGACY_POLICY_BUNDLE } from "../../src/hospital/fixtures/constitution"

function request(body: unknown): Request {
  return new Request("http://localhost/api/compile", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "compile-test" }, body: JSON.stringify(body) })
}

describe("POST /api/compile", () => {
  it("returns a validated fallback preview with standard metadata", async () => {
    const response = await createCompilePostHandler(() => new FallbackAiProvider())(request({ clause: SEED_CLAUSES[2], existingBundle: LEGACY_POLICY_BUNDLE }))
    const body = CompilePreviewResponseSchema.parse(await response.json())

    expect(response.status).toBe(200)
    expect(body.meta.source).toBe("fallback")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(body.data.proposedBundle.rules).toHaveLength(1)
    expect(body.data.diff.removedRules[0]?.id).toBe("rule.legacy-emergency-responder-override")
  })

  it("accepts an arbitrary valid clause from a mocked Groq provider", async () => {
    const clause = { ...SEED_CLAUSES[0]!, text: "A synthetic policy clause for arbitrary compilation." }
    const provider: AiProvider = {
      async compileClause(input) {
        return {
          data: { sourceClauseId: input.clause.id, normalizedClause: input.clause.text, interpretationSummary: "Mocked Groq compilation.", rules: [], ambiguities: [], assumptions: [] },
          meta: { requestId: "mock.compile", model: "mock-groq", durationMs: 1, source: "groq" },
        }
      },
      async revisePolicy() { throw new Error("unused") },
      async planAction() { throw new Error("unused") },
      async generateAttackVariation() { throw new Error("unused") },
    }

    const response = await createCompilePostHandler(() => provider)(request({ clause, existingBundle: LEGACY_POLICY_BUNDLE }))
    const body = CompilePreviewResponseSchema.parse(await response.json())

    expect(response.status).toBe(200)
    expect(body.meta.source).toBe("groq")
    expect(body.data.result.normalizedClause).toBe(clause.text)
  })

  it("normalizes live hero repair IDs and rule structure to the seeded contract", async () => {
    const correctedClause = { ...SEED_CLAUSES[2]!, text: "Require verified responders, credible imminent threats to life, and only minimum emergency fields." }
    const provider: AiProvider = {
      async compileClause(input) {
        return {
          data: { sourceClauseId: input.clause.id, normalizedClause: input.clause.text, interpretationSummary: "A live provider proposal with equivalent wording.", rules: CORRECTED_POLICY_BUNDLE.rules.map((rule) => ({ ...rule, id: `groq.${rule.id}` })), ambiguities: [], assumptions: [] },
          meta: { requestId: "mock.hero-repair", model: "mock-groq", durationMs: 1, source: "groq" },
        }
      },
      async revisePolicy() { throw new Error("unused") },
      async planAction() { throw new Error("unused") },
      async generateAttackVariation() { throw new Error("unused") },
    }

    const response = await createCompilePostHandler(() => provider)(request({ clause: correctedClause, existingBundle: LEGACY_POLICY_BUNDLE }))
    const body = CompilePreviewResponseSchema.parse(await response.json())

    expect(body.meta.source).toBe("groq")
    expect(body.data.proposedBundle.rules).toEqual(CORRECTED_POLICY_BUNDLE.rules)
    expect(body.data.analysisIssues.filter((issue) => issue.severity === "critical" || issue.severity === "high")).toEqual([])
  })

  it("rejects unknown request keys without calling the provider", async () => {
    const response = await POST(request({ clause: SEED_CLAUSES[2], existingBundle: LEGACY_POLICY_BUNDLE, extra: true }))
    const body = ApiFailureSchema.parse(await response.json())

    expect(response.status).toBe(400)
    expect(body.error.code).toBe("INVALID_REQUEST")
  })
})
