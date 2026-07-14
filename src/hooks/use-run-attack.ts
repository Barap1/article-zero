"use client";

import { useCallback } from "react";

import type { ExecuteRequestSchema } from "../domain/api";
import type { EnforcedActionResult } from "../lib/api-client";
import { apiClient } from "../lib/api-client";
import { useOperation } from "./use-operation";
import type { z } from "zod";

type RunAttackInput = z.infer<typeof ExecuteRequestSchema>;

export function useRunAttack() {
  const operation = useCallback((input: RunAttackInput): Promise<EnforcedActionResult> => apiClient.execute(input).then((response) => response.data), []);
  return useOperation(operation);
}
