import "server-only";

import Groq from "groq-sdk";
import type { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";

import { ProviderError } from "./errors";

export interface GroqConfiguration {
  readonly apiKey: string | undefined;
  readonly demoFallbacksEnabled: boolean;
  readonly policyModel: string;
  readonly fastModel: string;
  readonly timeoutMs: number;
}

export type GroqCompletionRequest = ChatCompletionCreateParamsNonStreaming;

export interface GroqCompletionResponse {
  readonly id: string;
  readonly model: string;
  readonly choices: readonly { readonly message: { readonly content: string | null } }[];
}

export interface GroqClient {
  complete(request: GroqCompletionRequest, signal: AbortSignal): Promise<GroqCompletionResponse>;
}

function booleanSetting(value: string | undefined, defaultValue: boolean, name: string): boolean {
  if (value === undefined || value === "") return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new ProviderError("PROVIDER_CONFIGURATION", `${name} must be a boolean string.`, false);
}

function modelSetting(value: string | undefined, fallback: string, name: string): string {
  const model = value ?? fallback;
  if (model.trim() === "") throw new ProviderError("PROVIDER_CONFIGURATION", `${name} must be nonempty.`, false);
  return model;
}

export function readGroqConfiguration(environment: Readonly<Record<string, string | undefined>> = process.env): GroqConfiguration {
  const demoFallbacksEnabled = booleanSetting(environment["DEMO_FALLBACKS_ENABLED"], true, "DEMO_FALLBACKS_ENABLED");
  const timeoutValue = environment["GROQ_REQUEST_TIMEOUT_MS"] ?? "8000";
  if (!/^\d+$/.test(timeoutValue)) throw new ProviderError("PROVIDER_CONFIGURATION", "GROQ_REQUEST_TIMEOUT_MS must be an integer.", false);
  const timeoutMs = Number(timeoutValue);
  if (timeoutMs < 1_000 || timeoutMs > 30_000) throw new ProviderError("PROVIDER_CONFIGURATION", "GROQ_REQUEST_TIMEOUT_MS must be between 1000 and 30000.", false);
  const apiKey = environment["GROQ_API_KEY"]?.trim() || undefined;
  if (apiKey === undefined && !demoFallbacksEnabled) throw new ProviderError("PROVIDER_CONFIGURATION", "GROQ_API_KEY is required when demo fallbacks are disabled.", false);
  return { apiKey, demoFallbacksEnabled, policyModel: modelSetting(environment["GROQ_POLICY_MODEL"], "openai/gpt-oss-120b", "GROQ_POLICY_MODEL"), fastModel: modelSetting(environment["GROQ_FAST_MODEL"], "openai/gpt-oss-20b", "GROQ_FAST_MODEL"), timeoutMs };
}

export class GroqSdkClient implements GroqClient {
  public constructor(private readonly sdk: Groq) {}

  public async complete(request: GroqCompletionRequest, signal: AbortSignal): Promise<GroqCompletionResponse> {
    return this.sdk.chat.completions.create(request, { signal });
  }
}

export function createGroqClient(configuration: GroqConfiguration): GroqClient {
  if (configuration.apiKey === undefined) throw new ProviderError("PROVIDER_CONFIGURATION", "GROQ_API_KEY is unavailable.", false);
  return new GroqSdkClient(new Groq({ apiKey: configuration.apiKey }));
}
