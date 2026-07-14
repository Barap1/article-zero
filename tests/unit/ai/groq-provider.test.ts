import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const groqSdkMock = vi.hoisted(() => ({ complete: vi.fn(), constructed: vi.fn() }));

vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    public readonly chat = { completions: { create: groqSdkMock.complete } };

    public constructor() {
      groqSdkMock.constructed();
    }
  },
}));

import { PROVIDER_ERROR_CODES, ProviderError } from "../../../src/ai/errors";
import { GroqAiProvider, type GroqClient } from "../../../src/ai/groq-provider";
import { createGroqClient, readGroqConfiguration, type GroqCompletionRequest } from "../../../src/ai/groq-client";
import { LEGACY_POLICY_BUNDLE, SEED_CLAUSES } from "../../../src/hospital/fixtures/constitution";
import { HERO_ATTACK_SCENARIO } from "../../../src/hospital/fixtures/scenarios";

const providerOptions = {
  fastModel: "openai/gpt-oss-20b",
  policyModel: "openai/gpt-oss-120b",
  timeoutMs: 8_000,
} as const;

function completion(content: unknown): ReturnType<GroqClient["complete"]> {
  return Promise.resolve({
    id: "chatcmpl.test",
    model: providerOptions.policyModel,
    choices: [{ message: { content: JSON.stringify(content) } }],
  });
}

describe("GroqAiProvider", () => {
  it("Given server configuration, When creating the SDK adapter, Then calls only the mocked SDK", async () => {
    groqSdkMock.complete.mockResolvedValueOnce({ id: "chatcmpl.sdk", model: providerOptions.fastModel, choices: [{ message: { content: "{}" } }] });
    const client = createGroqClient(readGroqConfiguration({ GROQ_API_KEY: "synthetic-test-key" }));
    const request: GroqCompletionRequest = {
      model: providerOptions.fastModel,
      messages: [{ role: "user", content: "test" }],
      max_completion_tokens: 300,
      temperature: 0,
      reasoning_effort: "low",
      include_reasoning: false,
      stream: false,
      response_format: { type: "json_schema", json_schema: { name: "test", strict: true, schema: {} } },
    };

    await client.complete(request, AbortSignal.timeout(8_000));

    expect(groqSdkMock.constructed).toHaveBeenCalledTimes(1);
    expect(groqSdkMock.complete).toHaveBeenCalledWith(request, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("Given a schema-valid rule with an unsupported tool, When compiling, Then rejects it as invalid provider output", async () => {
    const client: GroqClient = {
      complete: vi.fn(() => completion({
        sourceClauseId: "clause.emergency-response",
        normalizedClause: "Permit emergency disclosure.",
        interpretationSummary: "A rule was proposed.",
        rules: [{
          id: "rule.unsupported-tool",
          sourceClauseId: "clause.emergency-response",
          name: "Unsupported tool",
          description: "This must be rejected.",
          priority: 90,
          appliesToTools: ["unsupported_tool"],
          conditionMode: "ALL",
          conditions: [],
          effect: "DENY",
          allowedFields: [],
          onIndeterminate: "DENY",
          overridesRuleIds: [],
          severity: "critical",
          enabled: true,
        }],
        ambiguities: [],
        assumptions: [],
      })),
    };
    const provider = new GroqAiProvider(client, providerOptions);

    await expect(provider.compileClause({ clause: SEED_CLAUSES[2]!, existingBundle: LEGACY_POLICY_BUNDLE })).rejects.toMatchObject({
      code: "PROVIDER_INVALID_OUTPUT",
    } satisfies Pick<ProviderError, "code">);
  });

  it("Given a successful planner response, When planning an action, Then sends strict JSON output without reasoning or patient records", async () => {
    const sdkMock = vi.fn((request: GroqCompletionRequest) => {
      void request;
      return completion(HERO_ATTACK_SCENARIO.fallbackAction);
    });
    const provider = new GroqAiProvider({ complete: sdkMock }, providerOptions);

    const result = await provider.planAction({
      requestText: HERO_ATTACK_SCENARIO.requestText,
      actor: HERO_ATTACK_SCENARIO.evaluationContext.actor,
      patientId: HERO_ATTACK_SCENARIO.patientId,
      allowedTools: ["disclose_patient_data"],
    });

    expect(result.data).toEqual(HERO_ATTACK_SCENARIO.fallbackAction);
    expect(result.meta.source).toBe("groq");
    expect(sdkMock).toHaveBeenCalledWith(expect.objectContaining({
      include_reasoning: false,
      stream: false,
      response_format: expect.objectContaining({
        type: "json_schema",
        json_schema: expect.objectContaining({ strict: true }),
      }),
    }), expect.any(AbortSignal));
    const prompt = sdkMock.mock.calls[0]?.[0].messages[0]?.content;
    expect(prompt).toContain(HERO_ATTACK_SCENARIO.requestText);
    expect(prompt).not.toContain("Warfarin");
    expect(prompt).not.toContain("identityVerified");
  });

  it("Given one retryable rate limit, When compiling, Then retries only once", async () => {
    vi.useFakeTimers();
    const retryableError = Object.assign(new Error("rate limited"), { status: 429 });
    const sdkMock = vi.fn()
      .mockRejectedValueOnce(retryableError)
      .mockImplementationOnce(() => completion({
        sourceClauseId: "clause.emergency-response",
        normalizedClause: "Permit emergency disclosure.",
        interpretationSummary: "A rule was proposed.",
        rules: [],
        ambiguities: [],
        assumptions: [],
      }));
    const provider = new GroqAiProvider({ complete: sdkMock }, providerOptions);

    const pending = provider.compileClause({ clause: SEED_CLAUSES[2]!, existingBundle: LEGACY_POLICY_BUNDLE });
    await vi.advanceTimersByTimeAsync(400);

    await expect(pending).resolves.toMatchObject({ meta: { source: "groq" } });
    expect(sdkMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("Given a non-retryable invalid response, When compiling, Then does not retry", async () => {
    const sdkMock = vi.fn(() => completion({ invalid: true }));
    const provider = new GroqAiProvider({ complete: sdkMock }, providerOptions);

    await expect(provider.compileClause({ clause: SEED_CLAUSES[2]!, existingBundle: LEGACY_POLICY_BUNDLE })).rejects.toMatchObject({
      code: "PROVIDER_INVALID_OUTPUT",
    } satisfies Pick<ProviderError, "code">);
    expect(sdkMock).toHaveBeenCalledTimes(1);
    expect(PROVIDER_ERROR_CODES).toContain("PROVIDER_TIMEOUT");
  });

  it("Given a timeout error, When planning, Then returns a typed timeout error without retrying output validation", async () => {
    const timeoutError = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    const sdkMock = vi.fn(() => Promise.reject(timeoutError));
    const provider = new GroqAiProvider({ complete: sdkMock }, providerOptions);

    await expect(provider.planAction({
      requestText: HERO_ATTACK_SCENARIO.requestText,
      actor: HERO_ATTACK_SCENARIO.evaluationContext.actor,
      patientId: HERO_ATTACK_SCENARIO.patientId,
      allowedTools: ["disclose_patient_data"],
    })).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" } satisfies Pick<ProviderError, "code">);
    expect(sdkMock).toHaveBeenCalledTimes(2);
  });
});
