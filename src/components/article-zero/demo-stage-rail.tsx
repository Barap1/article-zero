"use client";

import { Check, Circle } from "lucide-react";

import type { WorkspaceState } from "../../domain/schemas";
import { cn } from "../../lib/cn";
import { getWorkflowAvailability, WORKFLOW_STAGES } from "../../workspace/workflow-availability";

export const DEMO_STAGES = WORKFLOW_STAGES;

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
  readonly workspace: WorkspaceState;
  readonly onStageChange: (stage: WorkspaceState["demoStage"]) => void;
};

export function DemoStageRail({ activeStage, workspace, onStageChange }: DemoStageRailProps) {
  const activeIndex = DEMO_STAGES.indexOf(activeStage);
  const availability = getWorkflowAvailability(workspace);

  const move = (index: number, direction = 1): void => {
    let candidate = index;
    while (candidate >= 0 && candidate < DEMO_STAGES.length) {
      const stage = DEMO_STAGES[candidate];
      if (stage !== undefined && availability[stage].available) {
        onStageChange(stage);
        return;
      }
      candidate += direction;
    }
  };

  return (
    <nav className="az-stage-rail" aria-label="Workflow stages">
      <div className="az-stage-rail-heading">
        <span className="az-eyebrow">Workflow</span>
        <span className="az-stage-count">{Math.max(activeIndex + 1, 1)} / {DEMO_STAGES.length}</span>
      </div>
      <div className="az-stage-list" role="tablist" aria-orientation="vertical">
        {DEMO_STAGES.map((stage, index) => {
          const selected = stage === activeStage;
          const stageState = availability[stage];
          return (
            <button
              className={cn("az-stage-item", selected && "az-stage-item-active", !stageState.available && "az-stage-item-unavailable")}
              key={stage}
              type="button"
              disabled={!stageState.available}
              role="tab"
              id={`stage-${stage.toLowerCase()}`}
              aria-selected={selected}
              aria-controls={`stage-panel-${stage.toLowerCase()}`}
              tabIndex={selected ? 0 : -1}
              title={stageState.reason ?? undefined}
              onClick={() => onStageChange(stage)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); move(index + 1, 1); }
                if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); move(index - 1, -1); }
                if (event.key === "Home") { event.preventDefault(); move(0, 1); }
                if (event.key === "End") { event.preventDefault(); move(DEMO_STAGES.length - 1, -1); }
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onStageChange(stage); }
              }}
            >
              <span className="az-stage-mark" aria-hidden="true">{stageState.complete ? <Check size={14} /> : <Circle size={12} />}</span>
              <span><span>{STAGE_LABELS[stage]}</span>{stageState.reason ? <small className="az-stage-reason">{stageState.reason}</small> : null}</span>
              {selected && <span className="az-stage-current">Current</span>}
            </button>
          );
        })}
      </div>
      <p className="az-rail-note">Each stage keeps the human policy, agent proposal, and enforced outcome distinct.</p>
    </nav>
  );
}
