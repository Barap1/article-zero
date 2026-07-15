"use client";

import { useCallback, useEffect } from "react";

import { apiClient } from "../lib/api-client";
import { useWorkspaceStore } from "../workspace/workspace-store";
import { useOperation } from "./use-operation";

export function useProviderHealth(enabled: boolean) {
  const setProviderStatus = useWorkspaceStore((state) => state.setProviderStatus);
  const operation = useCallback(async () => {
    try {
      const response = await apiClient.health();
      setProviderStatus(response.data.groqConfigured ? "configured" : "fallback");
      return response.data;
    } catch (error) {
      setProviderStatus("error");
      throw error;
    }
  }, [setProviderStatus]);
  const result = useOperation(operation);
  const submit = result.submit;

  useEffect(() => {
    if (enabled) void submit(undefined);
  }, [enabled, submit]);

  return result;
}
