"use client";

import { useState } from "react";

import type { AttackOperationResult } from "../../../hooks/use-run-attack";
import { useRunAttack } from "../../../hooks/use-run-attack";
import type { AttackRun, AuditEvent, ConstitutionVersion } from "../../../domain/schemas";
import { HERO_ATTACK_SCENARIO, LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO, PRIVACY_OFFICER_APPROVAL_SCENARIO } from "../../../hospital/fixtures/scenarios";
import { createId } from "../../../lib/ids";
import { formatDisplayLabel } from "../../../lib/display-label";
import { freezeAttack } from "../../../red-team/freeze-replay";
import { useWorkspaceStore } from "../../../workspace/workspace-store";

type ReplayComparisonProps = {
  readonly activeVersion: ConstitutionVersion;
  readonly legacyAttack: AttackRun | undefined;
  readonly onAddAttackRun: (run: AttackRun) => void;
  readonly onAddAuditEvents: (events: readonly AuditEvent[]) => void;
  readonly onComplete: () => void;
};

type ReplayActionState = {
  readonly status: "idle" | "running" | "success" | "error";
  readonly error: string | null;
};

const IDLE_ACTION: ReplayActionState = { status: "idle", error: null };

function toAttackRun(result: AttackOperationResult, scenarioId: string, versionId: string): AttackRun {
  const completedAt = new Date().toISOString();
  return { id: `attack.${createId()}`, scenarioId, constitutionVersionId: versionId, startedAt: completedAt, completedAt, requestText: result.action.sourceRequest, action: result.action, actionSource: result.source, decision: result.decision, toolResult: result.toolResult };
}

function outcomeLabel(run: AttackRun | undefined): string {
  if (run === undefined) return "Not produced";
  return formatDisplayLabel(run.decision.outcome);
}

function actionStatusLabel(state: ReplayActionState): string {
  if (state.status === "running") return "Running…";
  if (state.status === "success") return "Complete";
  if (state.status === "error") return "Needs retry";
  return "Ready";
}

export function ReplayComparison({ activeVersion, legacyAttack, onAddAttackRun, onAddAuditEvents, onComplete }: ReplayComparisonProps) {
  const attack = useRunAttack();
  const setProviderStatus = useWorkspaceStore((state) => state.setProviderStatus);
  const [fakeReplay, setFakeReplay] = useState<AttackRun>();
  const [legitimateControl, setLegitimateControl] = useState<AttackRun>();
  const [approvalRequest, setApprovalRequest] = useState<AttackRun>();
  const [approvedReplay, setApprovedReplay] = useState<AttackRun>();
  const [fakeState, setFakeState] = useState<ReplayActionState>(IDLE_ACTION);
  const [legitimateState, setLegitimateState] = useState<ReplayActionState>(IDLE_ACTION);
  const [approvalState, setApprovalState] = useState<ReplayActionState>(IDLE_ACTION);
  const [approvedState, setApprovedState] = useState<ReplayActionState>(IDLE_ACTION);

  const persist = (result: AttackOperationResult, scenarioId: string): AttackRun => {
    const run = toAttackRun(result, scenarioId, activeVersion.id);
    onAddAttackRun(run);
    onAddAuditEvents(result.auditEvents);
    if (result.source === "groq") setProviderStatus("live");
    if (result.source === "fallback") setProviderStatus("fallback");
    return run;
  };

  const replayFake = async (): Promise<void> => {
    if (legacyAttack === undefined) return;
    setFakeState({ status: "running", error: null });
    const result = await attack.submit({ scenario: HERO_ATTACK_SCENARIO, requestText: legacyAttack.requestText, bundle: activeVersion.policyBundle, frozen: freezeAttack(legacyAttack) });
    if (result === null) {
      setFakeState({ status: "error", error: "The fake request could not be replayed. Try again." });
      return;
    }
    setFakeReplay(persist(result, HERO_ATTACK_SCENARIO.id));
    setFakeState({ status: "success", error: null });
  };

  const runLegitimateControl = async (): Promise<void> => {
    if (fakeReplay === undefined) return;
    setLegitimateState({ status: "running", error: null });
    const result = await attack.submit({ scenario: LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO, requestText: LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.requestText, bundle: activeVersion.policyBundle });
    if (result === null) {
      setLegitimateState({ status: "error", error: "The verified responder control could not be produced. Try again." });
      return;
    }
    setLegitimateControl(persist(result, LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.id));
    setLegitimateState({ status: "success", error: null });
  };

  const requestApproval = async (): Promise<void> => {
    if (legitimateControl === undefined) return;
    setApprovalState({ status: "running", error: null });
    const result = await attack.submit({ scenario: PRIVACY_OFFICER_APPROVAL_SCENARIO, requestText: PRIVACY_OFFICER_APPROVAL_SCENARIO.requestText, bundle: activeVersion.policyBundle });
    if (result === null) {
      setApprovalState({ status: "error", error: "The approval request could not be produced. Try again." });
      return;
    }
    setApprovalRequest(persist(result, PRIVACY_OFFICER_APPROVAL_SCENARIO.id));
    setApprovalState({ status: "success", error: null });
  };

  const approveFrozenAction = async (): Promise<void> => {
    if (approvalRequest === undefined || approvedReplay !== undefined) return;
    setApprovedState({ status: "running", error: null });
    const timestamp = new Date().toISOString();
    const approvalEvent: AuditEvent = { id: `audit.${createId()}`, timestamp, type: "APPROVAL_RESOLVED", actorLabel: "Avery Cole", constitutionVersionId: activeVersion.id, relatedIds: [approvalRequest.id, approvalRequest.action.id], detail: "Privacy officer approved one frozen synthetic disclosure.", source: "user", integrityHash: `integrity.${createId()}` };
    onAddAuditEvents([approvalEvent]);
    const approvedScenario = {
      ...PRIVACY_OFFICER_APPROVAL_SCENARIO,
      evaluationContext: {
        ...PRIVACY_OFFICER_APPROVAL_SCENARIO.evaluationContext,
        approval: { status: "approved" as const, approverRole: "privacy_officer" as const, approvalRequestId: approvalRequest.id },
      },
    };
    const result = await attack.submit({ scenario: approvedScenario, requestText: approvalRequest.requestText, bundle: activeVersion.policyBundle, frozen: freezeAttack(approvalRequest) });
    if (result === null) {
      setApprovedState({ status: "error", error: "The approved replay could not be produced. Try again." });
      return;
    }
    setApprovedReplay(persist(result, PRIVACY_OFFICER_APPROVAL_SCENARIO.id));
    setApprovedState({ status: "success", error: null });
  };

  const readyToComplete = fakeReplay?.decision.outcome === "DENY" && legitimateControl?.decision.outcome === "ALLOW_WITH_FIELD_FILTER";
  const producedRequiredControls = Number(fakeReplay !== undefined) + Number(legitimateControl !== undefined);

  return <section className="az-replay-comparison" aria-labelledby="replay-comparison-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Sequential replay</p><h1 id="replay-comparison-title">Prove the repair still serves emergencies</h1><p className="az-panel-lede">Run the required controls in order: replay the fake request, then verify the legitimate responder. The optional approval branch stays secondary.</p></div></div>
    <div className="az-replay-grid">
      <section className="az-replay-card"><p className="az-eyebrow">Step 1 · Fake request</p><h2>{outcomeLabel(fakeReplay)}</h2><p>{legacyAttack === undefined ? "Run the legacy fake-responder request in Attack before replaying it." : "The original request and typed action are frozen; only the active bundle changes."}</p><p className="az-help-text">Status: {actionStatusLabel(fakeState)}</p><button className="az-button az-button-primary" type="button" onClick={() => { void replayFake(); }} disabled={legacyAttack === undefined || attack.isLoading || fakeState.status === "running"}>Replay exact frozen attack</button>{fakeState.error ? <p className="az-error-copy" role="alert">{fakeState.error}</p> : null}</section>
      <section className="az-replay-card"><p className="az-eyebrow">Step 2 · Verified responder</p><h2>{outcomeLabel(legitimateControl)}</h2><p>{legitimateControl?.decision.permittedFields.length ?? 0} minimum emergency fields permitted; all remaining requested fields are withheld.</p>{legitimateControl !== undefined ? <ul className="az-permitted-fields" aria-label="Permitted emergency fields">{legitimateControl.decision.permittedFields.map((field) => <li key={field}>{formatDisplayLabel(field)}</li>)}</ul> : null}<p className="az-help-text">Status: {actionStatusLabel(legitimateState)}{fakeReplay === undefined ? " · Complete Step 1 first." : ""}</p><button className="az-button az-button-primary" type="button" onClick={() => { void runLegitimateControl(); }} disabled={fakeReplay === undefined || attack.isLoading || legitimateState.status === "running"}>Run verified responder control</button>{legitimateState.error ? <p className="az-error-copy" role="alert">{legitimateState.error}</p> : null}</section>
    </div>
    <details className="az-approval-details"><summary>Optional advanced approval branch</summary><section className="az-approval-card" aria-labelledby="approval-control-title"><div><p className="az-eyebrow">Optional approval branch</p><h2 id="approval-control-title">Credential outage, trusted emergency</h2><p>After the two required controls, request privacy-officer approval and replay that frozen action once with approved context.</p><p className="az-help-text">Status: {actionStatusLabel(approvalState)}{legitimateControl === undefined ? " · Complete Step 2 first." : ""}</p></div>{approvalRequest === undefined ? <button className="az-button az-button-secondary" type="button" onClick={() => { void requestApproval(); }} disabled={legitimateControl === undefined || attack.isLoading || approvalState.status === "running"}>Request approval</button> : <button className="az-button az-button-secondary" type="button" onClick={() => { void approveFrozenAction(); }} disabled={approvedReplay !== undefined || attack.isLoading || approvedState.status === "running"}>{approvedReplay === undefined ? "Approve frozen action" : "Frozen action approved"}</button>}{approvedReplay !== undefined ? <p className="az-success-copy">{outcomeLabel(approvedReplay)} after privacy-officer approval.</p> : null}{approvalState.error ? <p className="az-error-copy" role="alert">{approvalState.error}</p> : null}{approvedState.error ? <p className="az-error-copy" role="alert">{approvedState.error}</p> : null}</section></details>
    <section className="az-replay-summary" aria-live="polite"><strong>{readyToComplete ? "Repair verified" : "Complete the required controls"}</strong><span>Required controls produced: {producedRequiredControls} of 2 · Fake request: {outcomeLabel(fakeReplay)} · Verified responder: {outcomeLabel(legitimateControl)}</span>{readyToComplete ? <button className="az-button az-button-primary" type="button" onClick={onComplete}>Finish workflow</button> : null}</section>
    {attack.state.status === "error" ? <p className="az-error-copy" role="alert">{attack.state.error.message}</p> : null}
  </section>;
}
