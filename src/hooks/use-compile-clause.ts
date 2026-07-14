"use client";

import { useCallback } from "react";

import type { CompileRequestSchema } from "../domain/api";
import type { CompilePreview } from "../domain/schemas";
import { apiClient } from "../lib/api-client";
import { useWorkspaceStore } from "../workspace/workspace-store";
import { useOperation } from "./use-operation";
import type { z } from "zod";

type CompileInput = z.infer<typeof CompileRequestSchema>;

export function useCompileClause() {
  const applyCompileResult = useWorkspaceStore((state) => state.applyCompileResult);
  const operation = useCallback(async (input: CompileInput): Promise<CompilePreview> => {
    const response = await apiClient.compileClause(input);
    applyCompileResult(input.clause.id, response.data.result);
    return response.data;
  }, [applyCompileResult]);
  return useOperation(operation);
}
