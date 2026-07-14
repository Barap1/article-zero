"use client";

import { useCallback } from "react";

import type { RevisionRequestSchema } from "../domain/api";
import type { RevisionPreview } from "../domain/schemas";
import { apiClient } from "../lib/api-client";
import { useWorkspaceStore } from "../workspace/workspace-store";
import { useOperation } from "./use-operation";
import type { z } from "zod";

type RevisionInput = z.infer<typeof RevisionRequestSchema>;

export function useRevisePolicy() {
  const applyRevisedRules = useWorkspaceStore((state) => state.applyRevisedRules);
  const operation = useCallback(async (input: RevisionInput): Promise<RevisionPreview> => {
    const response = await apiClient.revisePolicy(input);
    applyRevisedRules(response.data.result);
    return response.data;
  }, [applyRevisedRules]);
  return useOperation(operation);
}
