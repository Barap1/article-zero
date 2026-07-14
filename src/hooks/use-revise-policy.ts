"use client";

import { useCallback } from "react";

import type { RevisionRequestSchema } from "../domain/api";
import type { RevisionPreview } from "../domain/schemas";
import { apiClient } from "../lib/api-client";
import { useOperation } from "./use-operation";
import type { z } from "zod";

type RevisionInput = z.infer<typeof RevisionRequestSchema>;
export type RevisionOperationResult = { readonly preview: RevisionPreview; readonly source: "groq" | "fallback" | "deterministic" };

export function useRevisePolicy() {
  const operation = useCallback(async (input: RevisionInput): Promise<RevisionOperationResult> => {
    const response = await apiClient.revisePolicy(input);
    return { preview: response.data, source: response.meta.source };
  }, []);
  return useOperation(operation);
}
