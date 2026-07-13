// @vitest-environment node

import { describe, expect, it } from "vitest"

import { FallbackAiProvider } from "../../src/ai/fallback-provider"
import { POST } from "../../src/app/api/compile/route"
import { createCompilePostHandler } from "../../src/app/api/_lib/handlers"
import { CompilePreviewResponseSchema, ApiFailureSchema } from "../../src/domain/api"
import { SEED_CLAUSES, LEGACY_POLICY_BUNDLE } from "../../src/hospital/fixtures/constitution"

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

  it("rejects unknown request keys without calling the provider", async () => {
    const response = await POST(request({ clause: SEED_CLAUSES[2], existingBundle: LEGACY_POLICY_BUNDLE, extra: true }))
    const body = ApiFailureSchema.parse(await response.json())

    expect(response.status).toBe(400)
    expect(body.error.code).toBe("INVALID_REQUEST")
  })
})
