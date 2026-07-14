"use client";

import { useEffect, useState } from "react";

import type { WorkspaceState } from "../../domain/schemas";
import { useDemoKeyboardShortcuts } from "../../hooks/use-demo-keyboard-shortcuts";
import { useProviderHealth } from "../../hooks/use-provider-health";
import { useWorkspaceStore } from "../../workspace/workspace-store";
import { AppHeader } from "./app-header";
import { DemoBriefing } from "./demo-briefing";
import { DEMO_STAGES, DemoStageRail } from "./demo-stage-rail";
import { ResetDemoDialog } from "./reset-demo-dialog";
import { ConstitutionWorkspace } from "./constitution/constitution-workspace";
import { PolicyReview } from "./policy/policy-review";

type StagePanel = { readonly title: string; readonly component: string; readonly description: string; readonly marker: string };

const STAGE_PANELS: Record<WorkspaceState["demoStage"], StagePanel> = {
  CONSTITUTION: { title: "Constitution workspace", component: "ConstitutionWorkspace", description: "Write the human policy that the deterministic compiler will turn into enforceable rules.", marker: "Human policy" },
  ATTACK: { title: "Attack arena", component: "AttackArena", description: "Stage a synthetic responder request and inspect the typed agent proposal before it reaches the policy gate.", marker: "Agent proposal" },
  INCIDENT: { title: "Breach incident", component: "IncidentTrace", description: "See the exact fields exposed by the legacy baseline and the rule path that allowed them.", marker: "Enforced outcome" },
  AMENDMENT: { title: "Amendment workspace", component: "AmendmentWorkspace", description: "Refine the emergency clause, review the structured diff, and prepare a safer version for testing.", marker: "Human policy" },
  TESTING: { title: "Test gate", component: "ActivationPanel", description: "Run the seeded regression suite before any constitution can become active.", marker: "Test gate" },
  REPLAY: { title: "Replay comparison", component: "ReplayComparison", description: "Compare the frozen attack under the legacy and amended bundles with the same request text.", marker: "Deterministic replay" },
  COMPLETE: { title: "Demo complete", component: "CompletionSummary", description: "The constitutional boundary is ready to carry into the next task’s feature panel.", marker: "Enforced outcome" },
};

function StagePlaceholder({ stage }: { readonly stage: WorkspaceState["demoStage"] }) {
  const panel = STAGE_PANELS[stage];
  return (
    <section className="az-stage-panel" id={`stage-panel-${stage.toLowerCase()}`} role="tabpanel" aria-labelledby={`stage-${stage.toLowerCase()}`}>
      <div className="az-panel-header">
        <div>
          <p className="az-eyebrow">{panel.marker}</p>
          <h1>{panel.title}</h1>
        </div>
        <span className="az-placeholder-tag">Future panel: <code>{panel.component}</code></span>
      </div>
      <div className="az-placeholder-card">
        <div className="az-placeholder-index">{String(DEMO_STAGES.indexOf(stage) + 1).padStart(2, "0")}</div>
        <div>
          <h2>Command surface reserved for Task {stage === "CONSTITUTION" ? "12" : stage === "ATTACK" || stage === "INCIDENT" ? "13" : "14"}.</h2>
          <p>{panel.description}</p>
          <div className="az-placeholder-rule"><span className="az-status-dot" aria-hidden="true" />State is connected to the hydrated workspace and ready for the feature panel.</div>
        </div>
      </div>
      <div className="az-mental-model" aria-label="Article Zero mental model">
        <span><strong>Human policy</strong><small>What the author wrote</small></span>
        <span><strong>Compiled policy</strong><small>What the engine enforces</small></span>
        <span><strong>Agent proposal</strong><small>What the hospital AI attempted</small></span>
        <span><strong>Enforced outcome</strong><small>What the gate allowed</small></span>
      </div>
    </section>
  );
}

export function ArticleZeroCommandCenter() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const hasHydrated = useWorkspaceStore((state) => state.hasHydrated);
  const isHydrating = useWorkspaceStore((state) => state.isHydrating);
  const showBriefing = useWorkspaceStore((state) => state.showBriefing);
  const hydrate = useWorkspaceStore((state) => state.hydrate);
  const openConstitution = useWorkspaceStore((state) => state.openConstitution);
  const setDemoStage = useWorkspaceStore((state) => state.setDemoStage);
  const resetDemo = useWorkspaceStore((state) => state.resetDemo);
  const exportAuditPackage = useWorkspaceStore((state) => state.exportAuditPackage);
  const [resetOpen, setResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { void hydrate(); }, [hydrate]);
  useDemoKeyboardShortcuts();
  useProviderHealth(hasHydrated);

  const handleExport = async (): Promise<void> => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const blob = await exportAuditPackage();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "article-zero-audit-package.json";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = async (): Promise<void> => {
    setIsResetting(true);
    try { await resetDemo(); setResetOpen(false); } finally { setIsResetting(false); }
  };

  if (!hasHydrated || isHydrating) {
    return <main className="az-shell az-shell-loading"><div className="az-loading-mark" aria-hidden="true" /><p role="status">Restoring the local workspace…</p></main>;
  }

  return (
    <main className="az-shell">
      <AppHeader workspace={workspace} onReset={() => setResetOpen(true)} onExport={() => { void handleExport(); }} isExporting={isExporting} />
      <div className="az-command-layout">
        <aside className="az-sidebar">
          <DemoStageRail activeStage={workspace.demoStage} onStageChange={setDemoStage} />
          <div className="az-sidebar-footer"><span className="az-sidebar-footer-label">Local workspace</span><span>Browser persistence on</span></div>
        </aside>
        <div className="az-main-surface">
          {showBriefing ? <DemoBriefing onOpenConstitution={openConstitution} onRunGuidedDemo={openConstitution} /> : workspace.demoStage === "CONSTITUTION" ? <><ConstitutionWorkspace /><PolicyReview /></> : <StagePlaceholder stage={workspace.demoStage} />}
        </div>
      </div>
      <ResetDemoDialog open={resetOpen} isResetting={isResetting} onCancel={() => setResetOpen(false)} onConfirm={() => { void handleReset(); }} />
    </main>
  );
}
