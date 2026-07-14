"use client";

import { Check, Circle } from "lucide-react";

import type { WorkspaceState } from "../../domain/schemas";
import { cn } from "../../lib/cn";

export const DEMO_STAGES: readonly WorkspaceState["demoStage"][] = ["CONSTITUTION", "ATTACK", "INCIDENT", "AMENDMENT", "TESTING", "REPLAY", "COMPLETE"];

const STAGE_LABELS: Record<WorkspaceState["demoStage"], string> = {
  CONSTITUTION: "Constitution",
  ATTACK: "Attack",
  INCIDENT: "Incident",
  AMENDMENT: "Amendment",
  TESTING: "Testing",
  REPLAY: "Replay",
  COMPLETE: "Complete",
};

type DemoStageRailProps = {
  readonly activeStage: WorkspaceState["demoStage"];
  readonly onStageChange: (stage: WorkspaceState["demoStage"]) => void;
};

export function DemoStageRail({ activeStage, onStageChange }: DemoStageRailProps) {
  const activeIndex = DEMO_STAGES.indexOf(activeStage);

  const move = (index: number): void => {
    const stage = DEMO_STAGES[index];
    if (stage !== undefined) onStageChange(stage);
  };

  return (
    <nav className="az-stage-rail" aria-label="Demo stages">
      <div className="az-stage-rail-heading">
        <span className="az-eyebrow">Demo sequence</span>
        <span className="az-stage-count">{Math.max(activeIndex + 1, 1)} / {DEMO_STAGES.length}</span>
      </div>
      <div className="az-stage-list" role="tablist" aria-orientation="vertical">
        {DEMO_STAGES.map((stage, index) => {
          const selected = stage === activeStage;
          const complete = activeIndex > index;
          return (
            <button
              className={cn("az-stage-item", selected && "az-stage-item-active")}
              key={stage}
              type="button"
              role="tab"
              id={`stage-${stage.toLowerCase()}`}
              aria-selected={selected}
              aria-controls={`stage-panel-${stage.toLowerCase()}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onStageChange(stage)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); move(Math.min(index + 1, DEMO_STAGES.length - 1)); }
                if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); move(Math.max(index - 1, 0)); }
                if (event.key === "Home") { event.preventDefault(); move(0); }
                if (event.key === "End") { event.preventDefault(); move(DEMO_STAGES.length - 1); }
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onStageChange(stage); }
              }}
            >
              <span className="az-stage-mark" aria-hidden="true">{complete ? <Check size={14} /> : <Circle size={12} />}</span>
              <span>{STAGE_LABELS[stage]}</span>
              {selected && <span className="az-stage-current">Current</span>}
            </button>
          );
        })}
      </div>
      <p className="az-rail-note">Each stage keeps the human policy, agent proposal, and enforced outcome distinct.</p>
    </nav>
  );
}
