"use client";

import { useCallback } from "react";

import { SEEDED_REGRESSION_CASES } from "../activation";
import { runRegressionSuite } from "../activation/run-regression-suite";
import type { ConstitutionVersion, TestRun } from "../domain/schemas";
import { useWorkspaceStore } from "../workspace/workspace-store";
import { useOperation } from "./use-operation";

export function useRunRegressionSuite() {
  const addTestRun = useWorkspaceStore((state) => state.addTestRun);
  const operation = useCallback(async (version: ConstitutionVersion): Promise<TestRun> => {
    const result = await runRegressionSuite({ version, cases: SEEDED_REGRESSION_CASES });
    addTestRun(result);
    return result;
  }, [addTestRun]);
  return useOperation(operation);
}
