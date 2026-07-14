"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import type { WorkspaceState } from "../../domain/schemas";
import { analyzePolicyBundle } from "../../policy-engine/analyze-policy-bundle";
import { useActivateConstitution } from "../../hooks/use-activate-constitution";
import { useDemoKeyboardShortcuts } from "../../hooks/use-demo-keyboard-shortcuts";
import { useProviderHealth } from "../../hooks/use-provider-health";
import { useRunRegressionSuite } from "../../hooks/use-run-regression-suite";
import { useWorkspaceStore } from "../../workspace/workspace-store";
import { AppHeader } from "./app-header";
import { DemoBriefing } from "./demo-briefing";
import { DEMO_STAGES, DemoStageRail } from "./demo-stage-rail";
import { ResetDemoDialog } from "./reset-demo-dialog";
import { ConstitutionWorkspace } from "./constitution/constitution-workspace";
import { PolicyReview } from "./policy/policy-review";
import { AttackArena } from "./attack/attack-arena";
import { ActivationPanel } from "./activation/activation-panel";
import { ReplayComparison } from "./activation/replay-comparison";
import { AuditDrawer } from "./audit-drawer";

const HERO_AMENDMENT = "During a credible and imminent threat to life, disclose only the minimum necessary emergency information to a verified emergency responder. If required facts cannot be verified, request approval from a hospital privacy officer; otherwise deny access.";

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
  const addAttackRun = useWorkspaceStore((state) => state.addAttackRun);
  const addAuditEvents = useWorkspaceStore((state) => state.addAuditEvents);
  const acknowledgeIssue = useWorkspaceStore((state) => state.acknowledgeIssue);
  const runRegression = useRunRegressionSuite();
  const activateConstitution = useActivateConstitution();
  const editClause = useWorkspaceStore((state) => state.editClause);
  const selectClause = useWorkspaceStore((state) => state.selectClause);
  const [resetOpen, setResetOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [workspace.demoStage, showBriefing]);
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

  const activeVersion = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  const selectedAttackRun = workspace.attackRuns.find((run) => run.id === workspace.selectedAttackRunId);
  if (activeVersion === undefined) return <main className="az-shell az-shell-loading"><p role="alert">The active policy version is unavailable.</p></main>;

  return (
    <main className="az-shell">
      <a className="az-skip-link" href="#article-zero-main">Skip to command surface</a>
      <AppHeader workspace={workspace} onReset={() => setResetOpen(true)} onExport={() => { void handleExport(); }} onOpenAudit={() => setAuditOpen(true)} isExporting={isExporting} />
      <div className="az-command-layout">
        <aside className="az-sidebar">
          <DemoStageRail activeStage={workspace.demoStage} onStageChange={setDemoStage} />
          <div className="az-sidebar-footer"><span className="az-sidebar-footer-label">Local workspace</span><span>Browser persistence on</span></div>
        </aside>
        <div className="az-main-surface" id="article-zero-main" tabIndex={-1}>
          <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
          <AnimatePresence initial={false}>
          <motion.div className="az-stage-transition" key={showBriefing ? "briefing" : workspace.demoStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
          {showBriefing ? <DemoBriefing onOpenConstitution={openConstitution} onRunGuidedDemo={openConstitution} /> : workspace.demoStage === "CONSTITUTION" || workspace.demoStage === "AMENDMENT" ? <><ConstitutionWorkspace /><PolicyReview /></> : workspace.demoStage === "ATTACK" || workspace.demoStage === "INCIDENT" ? <AttackArena key={workspace.demoStage} version={activeVersion} {...(workspace.demoStage === "INCIDENT" && selectedAttackRun !== undefined ? { initialRun: selectedAttackRun } : {})} onAddAttackRun={addAttackRun} onAddAuditEvents={addAuditEvents} onAdvanceToAmendment={() => { editClause("clause.emergency-response", HERO_AMENDMENT); selectClause("clause.emergency-response"); setDemoStage("AMENDMENT"); }} /> : workspace.demoStage === "TESTING" ? (() => {
            const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
            if (draft === undefined) return <StagePlaceholder stage="TESTING" />;
            const issues = analyzePolicyBundle(draft.policyBundle);
            return <ActivationPanel draft={draft} workspace={workspace} issues={issues} onRun={async (version) => { await runRegression.submit(version); }} onActivate={async () => { const result = await activateConstitution.submit({ workspace, draftVersionId: draft.id, issues }); if (result !== null) setDemoStage("REPLAY"); }} onAcknowledge={acknowledgeIssue} />;
          })() : workspace.demoStage === "REPLAY" ? <ReplayComparison activeVersion={activeVersion} legacyAttack={workspace.attackRuns.find((run) => run.scenarioId === "scenario.fake-responder-full-record" && run.constitutionVersionId !== activeVersion.id)} onAddAttackRun={addAttackRun} onAddAuditEvents={addAuditEvents} onComplete={() => setDemoStage("COMPLETE")} /> : <StagePlaceholder stage={workspace.demoStage} />}
          </motion.div>
          </AnimatePresence>
          </MotionConfig>
          <footer className="az-footer">Hackathon prototype. Synthetic data. Not for clinical use.</footer>
        </div>
      </div>
      <ResetDemoDialog open={resetOpen} isResetting={isResetting} onCancel={() => setResetOpen(false)} onConfirm={() => { void handleReset(); }} />
      {auditOpen ? <AuditDrawer events={workspace.auditEvents} onClose={() => setAuditOpen(false)} onExport={() => { void handleExport(); }} /> : null}
    </main>
  );
}
