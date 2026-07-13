import "server-only";

import { FallbackAiProvider } from "./fallback-provider";
import { createGroqClient, readGroqConfiguration } from "./groq-client";
import { GroqAiProvider } from "./groq-provider";
import type { AiProvider } from "./types";

export function createAiProvider(environment: Readonly<Record<string, string | undefined>> = process.env): AiProvider {
  const configuration = readGroqConfiguration(environment);
  if (configuration.apiKey === undefined) return new FallbackAiProvider();
  return new GroqAiProvider(createGroqClient(configuration), configuration);
}

export type { AiCallMeta, AiProvider, AiResult } from "./types";
