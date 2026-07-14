"use client";

import { useCallback } from "react";

import { activateConstitution, type ActivationTransition } from "../activation";
import type { PolicyIssue, WorkspaceState } from "../domain/schemas";
import { useWorkspaceStore } from "../workspace/workspace-store";
import { useOperation } from "./use-operation";

type ActivateInput = { readonly workspace: WorkspaceState; readonly draftVersionId: string; readonly issues: readonly PolicyIssue[] };

export function useActivateConstitution() {
  const activateVersion = useWorkspaceStore((state) => state.activateVersion);
  const operation = useCallback(async (input: ActivateInput): Promise<ActivationTransition> => {
    const result = await activateConstitution(input);
    activateVersion(result);
    return result;
  }, [activateVersion]);
  return useOperation(operation);
}
