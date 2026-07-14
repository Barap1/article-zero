"use client";

import { useEffect } from "react";

import type { WorkspaceState } from "../domain/schemas";
import { useWorkspaceStore } from "../workspace/workspace-store";

const STAGES: readonly WorkspaceState["demoStage"][] = ["CONSTITUTION", "ATTACK", "INCIDENT", "AMENDMENT", "TESTING", "REPLAY", "COMPLETE"];

export function useDemoKeyboardShortcuts(): void {
  const setDemoStage = useWorkspaceStore((state) => state.setDemoStage);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.altKey || event.key < "1" || event.key > "7") return;
      const index = Number(event.key) - 1;
      const stage = STAGES[index];
      if (stage === undefined) return;
      event.preventDefault();
      setDemoStage(stage);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setDemoStage]);
}
