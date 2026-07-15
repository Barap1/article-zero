"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { analyzePolicyBundle } from "../../policy-engine/analyze-policy-bundle";
import { ProviderStatusBadge } from "./provider-status-badge";
import { useActivateConstitution } from "../../hooks/use-activate-constitution";
import { useDemoKeyboardShortcuts } from "../../hooks/use-demo-keyboard-shortcuts";
import { useProviderHealth } from "../../hooks/use-provider-health";
import { useRunRegressionSuite } from "../../hooks/use-run-regression-suite";
import { useWorkspaceStore } from "../../workspace/workspace-store";
import { AppHeader } from "./app-header";
import { AmendmentWorkspace } from "./amendment-workspace";
import { CompletionSummary } from "./completion-summary";
import { DemoBriefing } from "./demo-briefing";
import { DemoStageRail } from "./demo-stage-rail";
import { ResetDemoDialog } from "./reset-demo-dialog";
import { ConstitutionWorkspace } from "./constitution/constitution-workspace";
import { PolicyReview } from "./policy/policy-review";
import { AttackArena } from "./attack/attack-arena";
import { IncidentWorkspace } from "./attack/incident-workspace";
import { ActivationPanel } from "./activation/activation-panel";
import { ReplayComparison } from "./activation/replay-comparison";
import { AuditDrawer } from "./audit-drawer";

export function ArticleZeroCommandCenter() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const hasHydrated = useWorkspaceStore((state) => state.hasHydrated);
  const isHydrating = useWorkspaceStore((state) => state.isHydrating);
  const showBriefing = useWorkspaceStore((state) => state.showBriefing);
  const hydrate = useWorkspaceStore((state) => state.hydrate);
  const openConstitution = useWorkspaceStore((state) => state.openConstitution);
  const returnHome = useWorkspaceStore((state) => state.returnHome);
  const setDemoStage = useWorkspaceStore((state) => state.setDemoStage);
  const resetDemo = useWorkspaceStore((state) => state.resetDemo);
  const exportAuditPackage = useWorkspaceStore((state) => state.exportAuditPackage);
  const addAttackRun = useWorkspaceStore((state) => state.addAttackRun);
  const addAuditEvents = useWorkspaceStore((state) => state.addAuditEvents);
  const acknowledgeIssue = useWorkspaceStore((state) => state.acknowledgeIssue);
  const runRegression = useRunRegressionSuite();
  const activateConstitution = useActivateConstitution();
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
    return <main className="az-shell az-shell-loading"><a className="az-skip-link" href="#article-zero-main">Skip to command surface</a><div className="az-loading-mark" aria-hidden="true" /><p role="status">Restoring the local workspace…</p></main>;
  }

  const activeVersion = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  const selectedAttackRun = workspace.attackRuns.find((run) => run.id === workspace.selectedAttackRunId);
  if (activeVersion === undefined) return <main className="az-shell az-shell-loading"><p role="alert">The active policy version is unavailable.</p></main>;

  return (
    <main className="az-shell">
      <a className="az-skip-link" href="#article-zero-main">Skip to command surface</a>
      <AppHeader onReturnHome={returnHome} onReset={() => setResetOpen(true)} onExport={() => { void handleExport(); }} onOpenAudit={() => setAuditOpen(true)} isExporting={isExporting} />
      <div className="az-command-layout">
        <aside className="az-sidebar">
          <DemoStageRail activeStage={workspace.demoStage} workspace={workspace} onStageChange={setDemoStage} />
        </aside>
        <div className="az-main-surface" id="article-zero-main" tabIndex={-1}>
          {!showBriefing ? <div className="az-workspace-context" aria-label="Workspace context"><div><span>Working version</span><strong>{activeVersion.label}</strong></div><ProviderStatusBadge source={workspace.providerStatus} /><span className="az-synthetic-note"><span className="az-status-dot az-status-dot-synthetic" aria-hidden="true" />Sample data only</span></div> : null}
          <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
          <AnimatePresence initial={false}>
          <motion.div className="az-stage-transition" key={showBriefing ? "briefing" : workspace.demoStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
          {showBriefing ? <DemoBriefing activeVersionLabel={activeVersion.label} providerStatus={workspace.providerStatus} onOpenConstitution={openConstitution} onRunGuidedDemo={openConstitution} /> : workspace.demoStage === "CONSTITUTION" ? <><ConstitutionWorkspace /><PolicyReview /></> : workspace.demoStage === "ATTACK" ? <AttackArena key="attack" version={activeVersion} onAddAttackRun={addAttackRun} onAddAuditEvents={addAuditEvents} onAdvanceToAmendment={() => setDemoStage("AMENDMENT")} onViewIncident={() => setDemoStage("INCIDENT")} /> : workspace.demoStage === "INCIDENT" ? <IncidentWorkspace key="incident" version={activeVersion} run={selectedAttackRun} onAmend={() => {
            const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
            const clauseId = activeVersion.policyBundle.rules.find((rule) => selectedAttackRun?.decision.appliedRuleIds.includes(rule.id))?.sourceClauseId ?? draft?.clauses[0]?.id;
            if (clauseId !== undefined) selectClause(clauseId);
            setDemoStage("AMENDMENT");
          }} /> : workspace.demoStage === "AMENDMENT" ? <AmendmentWorkspace onContinueTesting={() => setDemoStage("TESTING")} /> : workspace.demoStage === "TESTING" ? (() => {
            const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
            if (draft === undefined) return <p role="alert" className="az-error-copy">The draft policy is unavailable. Return to the policy workspace and try again.</p>;
            const issues = analyzePolicyBundle(draft.policyBundle);
            return <ActivationPanel draft={draft} workspace={workspace} issues={issues} isRunning={runRegression.isLoading} isActivating={activateConstitution.isLoading} onRun={async (version) => { await runRegression.submit(version); }} onActivate={async () => { const result = await activateConstitution.submit({ workspace, draftVersionId: draft.id, issues }); if (result !== null) setDemoStage("REPLAY"); }} onAcknowledge={acknowledgeIssue} />;
          })() : workspace.demoStage === "REPLAY" ? <ReplayComparison activeVersion={activeVersion} legacyAttack={workspace.attackRuns.find((run) => run.scenarioId === "scenario.fake-responder-full-record" && run.constitutionVersionId !== activeVersion.id)} onAddAttackRun={addAttackRun} onAddAuditEvents={addAuditEvents} onComplete={() => setDemoStage("COMPLETE")} /> : <CompletionSummary onOpenAudit={() => setAuditOpen(true)} onExport={() => { void handleExport(); }} onReturnHome={returnHome} onStartAnotherSimulation={() => { void resetDemo(); }} isExporting={isExporting} />}
          </motion.div>
          </AnimatePresence>
          </MotionConfig>
          <footer className="az-footer">Sample workspace. Synthetic data only. Not for clinical use.</footer>
        </div>
      </div>
      <ResetDemoDialog open={resetOpen} isResetting={isResetting} onCancel={() => setResetOpen(false)} onConfirm={() => { void handleReset(); }} />
      {auditOpen ? <AuditDrawer events={workspace.auditEvents} onClose={() => setAuditOpen(false)} onExport={() => { void handleExport(); }} /> : null}
    </main>
  );
}
