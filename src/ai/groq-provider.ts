import "server-only";

import type { z } from "zod";

import { ProviderError } from "./errors";
import type { GroqClient, GroqCompletionRequest } from "./groq-client";
import { attackVariationPrompt, compileClausePrompt, planActionPrompt, revisePolicyPrompt } from "./prompts";
import { AI_OUTPUT_SCHEMAS, jsonSchemaFor } from "./schemas";
import type { AiProvider, AiResult } from "./types";

export type { GroqClient } from "./groq-client";

export interface GroqProviderOptions {
  readonly policyModel: string;
  readonly fastModel: string;
  readonly timeoutMs: number;
}

function providerError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : undefined;
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return new ProviderError("PROVIDER_TIMEOUT", "Groq request timed out.", true, error);
  if (status === 429) return new ProviderError("PROVIDER_RATE_LIMIT", "Groq rate limit reached.", true, error);
  if (status !== undefined && status >= 500) return new ProviderError("PROVIDER_UNAVAILABLE", "Groq is unavailable.", true, error);
  if (status !== undefined) return new ProviderError("PROVIDER_UNAVAILABLE", "Groq request was rejected.", false, error);
  return new ProviderError("PROVIDER_NETWORK", "Groq network request failed.", true, error);
}

function parseOutput<T>(content: string | null, schema: z.ZodType<T>): T {
  if (content === null) throw new ProviderError("PROVIDER_EMPTY_RESPONSE", "Groq returned no structured output.", false);
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new ProviderError("PROVIDER_INVALID_OUTPUT", "Groq returned invalid JSON.", false, error);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new ProviderError("PROVIDER_INVALID_OUTPUT", "Groq returned invalid structured output.", false, result.error);
  return result.data;
}

function retryDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 250 + Math.floor(Math.random() * 151)));
}

export class GroqAiProvider implements AiProvider {
  public constructor(private readonly client: GroqClient, private readonly options: GroqProviderOptions) {}

  public compileClause(input: Parameters<AiProvider["compileClause"]>[0]) {
    return this.request("compileClause", compileClausePrompt(input), AI_OUTPUT_SCHEMAS.compileClause, this.options.policyModel, "medium", 0, 2_400);
  }

  public revisePolicy(input: Parameters<AiProvider["revisePolicy"]>[0]) {
    return this.request("revisePolicy", revisePolicyPrompt(input), AI_OUTPUT_SCHEMAS.revisePolicy, this.options.policyModel, "medium", 0, 2_400);
  }

  public planAction(input: Parameters<AiProvider["planAction"]>[0]) {
    return this.request("planAction", planActionPrompt(input), AI_OUTPUT_SCHEMAS.planAction, this.options.fastModel, "low", 0, 900);
  }

  public generateAttackVariation(input: Parameters<AiProvider["generateAttackVariation"]>[0]) {
    return this.request("generateAttackVariation", attackVariationPrompt(input), AI_OUTPUT_SCHEMAS.generateAttackVariation, this.options.fastModel, "low", 0.4, 300);
  }

  private async request<T>(operation: string, prompt: string, schema: z.ZodType<T>, model: string, reasoningEffort: "low" | "medium", temperature: number, maxCompletionTokens: number): Promise<AiResult<T>> {
    const startedAt = Date.now();
    const request: GroqCompletionRequest = {
      model,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: maxCompletionTokens,
      temperature,
      reasoning_effort: reasoningEffort,
      include_reasoning: false,
      stream: false,
      response_format: { type: "json_schema", json_schema: { name: operation, strict: true, schema: jsonSchemaFor(schema) } },
    };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await this.client.complete(request, AbortSignal.timeout(this.options.timeoutMs));
        const output = parseOutput(response.choices[0]?.message.content ?? null, schema);
        return { data: output, meta: { requestId: response.id, model: response.model, durationMs: Date.now() - startedAt, source: "groq" } };
      } catch (error) {
        const normalized = providerError(error);
        if (attempt === 0 && normalized.retryable) {
          await retryDelay();
          continue;
        }
        throw normalized;
      }
    }
    throw new ProviderError("PROVIDER_UNAVAILABLE", "Groq retry limit reached.", false);
  }
}
