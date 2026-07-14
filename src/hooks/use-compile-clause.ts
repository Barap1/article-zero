"use client";

import { useCallback } from "react";

import type { CompileRequestSchema } from "../domain/api";
import type { CompilePreview } from "../domain/schemas";
import { apiClient } from "../lib/api-client";
import { useOperation } from "./use-operation";
import type { z } from "zod";

type CompileInput = z.infer<typeof CompileRequestSchema>;
export type CompileOperationResult = { readonly preview: CompilePreview; readonly source: "groq" | "fallback" | "deterministic" };

export function useCompileClause() {
  const operation = useCallback(async (input: CompileInput): Promise<CompileOperationResult> => {
    const response = await apiClient.compileClause(input);
    return { preview: response.data, source: response.meta.source };
  }, []);
  return useOperation(operation);
}
