import { describe, expect, it } from "vitest";

import { ApiFailureSchema } from "../../src/domain/api";
import { CORRECTED_POLICY_BUNDLE } from "../../src/hospital/fixtures/constitution";
import { HERO_ATTACK_SCENARIO } from "../../src/hospital/fixtures/scenarios";
import { createInMemoryHospitalTools } from "../../src/hospital/in-memory-tools";
import { createExecutePostHandler } from "../../src/app/api/_lib/handlers";

describe("POST /api/execute", () => {
  it("Given a client request for the corrected bundle, When the route executes it, Then it recomputes a denial", async () => {
    const handler = createExecutePostHandler(createInMemoryHospitalTools);
    const response = await handler(new Request("http://localhost/api/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: HERO_ATTACK_SCENARIO.fallbackAction, context: HERO_ATTACK_SCENARIO.evaluationContext, bundle: CORRECTED_POLICY_BUNDLE }) }));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('"outcome":"DENY"');
  });

  it("Given a client-supplied decision, When the route executes it, Then it rejects the unauthorized field", async () => {
    const handler = createExecutePostHandler(createInMemoryHospitalTools);
    const response = await handler(new Request("http://localhost/api/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: HERO_ATTACK_SCENARIO.fallbackAction, context: HERO_ATTACK_SCENARIO.evaluationContext, bundle: CORRECTED_POLICY_BUNDLE, decision: { outcome: "ALLOW" } }) }));
    const body = ApiFailureSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_REQUEST");
  });
});
