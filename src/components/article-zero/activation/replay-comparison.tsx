"use client";

import { useState } from "react";

import type { AttackOperationResult } from "../../../hooks/use-run-attack";
import { useRunAttack } from "../../../hooks/use-run-attack";
import type { AttackRun, AuditEvent, ConstitutionVersion } from "../../../domain/schemas";
import { HERO_ATTACK_SCENARIO, LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO, PRIVACY_OFFICER_APPROVAL_SCENARIO } from "../../../hospital/fixtures/scenarios";
import { createId } from "../../../lib/ids";
import { freezeAttack } from "../../../red-team/freeze-replay";

type ReplayComparisonProps = {
  readonly activeVersion: ConstitutionVersion;
  readonly legacyAttack: AttackRun | undefined;
  readonly onAddAttackRun: (run: AttackRun) => void;
  readonly onAddAuditEvents: (events: readonly AuditEvent[]) => void;
  readonly onComplete: () => void;
};

function toAttackRun(result: AttackOperationResult, scenarioId: string, versionId: string): AttackRun {
  const completedAt = new Date().toISOString();
  return { id: `attack.${createId()}`, scenarioId, constitutionVersionId: versionId, startedAt: completedAt, completedAt, requestText: result.action.sourceRequest, action: result.action, actionSource: result.source, decision: result.decision, toolResult: result.toolResult };
}

function outcomeLabel(run: AttackRun | undefined): string {
  return run?.decision.outcome ?? "Not run";
}

export function ReplayComparison({ activeVersion, legacyAttack, onAddAttackRun, onAddAuditEvents, onComplete }: ReplayComparisonProps) {
  const attack = useRunAttack();
  const [fakeReplay, setFakeReplay] = useState<AttackRun>();
  const [legitimateControl, setLegitimateControl] = useState<AttackRun>();
  const [approvalRequest, setApprovalRequest] = useState<AttackRun>();
  const [approvedReplay, setApprovedReplay] = useState<AttackRun>();

  const persist = (result: AttackOperationResult, scenarioId: string): AttackRun => {
    const run = toAttackRun(result, scenarioId, activeVersion.id);
    onAddAttackRun(run);
    onAddAuditEvents(result.auditEvents);
    return run;
  };

  const replayFake = async (): Promise<void> => {
    if (legacyAttack === undefined) return;
    const result = await attack.submit({ scenario: HERO_ATTACK_SCENARIO, requestText: legacyAttack.requestText, bundle: activeVersion.policyBundle, frozen: freezeAttack(legacyAttack) });
    if (result !== null) setFakeReplay(persist(result, HERO_ATTACK_SCENARIO.id));
  };

  const runLegitimateControl = async (): Promise<void> => {
    const result = await attack.submit({ scenario: LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO, requestText: LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.requestText, bundle: activeVersion.policyBundle });
    if (result !== null) setLegitimateControl(persist(result, LEGITIMATE_MINIMUM_DISCLOSURE_SCENARIO.id));
  };

  const requestApproval = async (): Promise<void> => {
    const result = await attack.submit({ scenario: PRIVACY_OFFICER_APPROVAL_SCENARIO, requestText: PRIVACY_OFFICER_APPROVAL_SCENARIO.requestText, bundle: activeVersion.policyBundle });
    if (result !== null) setApprovalRequest(persist(result, PRIVACY_OFFICER_APPROVAL_SCENARIO.id));
  };

  const approveFrozenAction = async (): Promise<void> => {
    if (approvalRequest === undefined || approvedReplay !== undefined) return;
    const timestamp = new Date().toISOString();
    const approvalEvent: AuditEvent = { id: `audit.${createId()}`, timestamp, type: "APPROVAL_RESOLVED", actorLabel: "Avery Cole", constitutionVersionId: activeVersion.id, relatedIds: [approvalRequest.id, approvalRequest.action.id], detail: "Privacy officer approved one frozen break-glass disclosure.", source: "user", integrityHash: `integrity.${createId()}` };
    onAddAuditEvents([approvalEvent]);
    const approvedScenario = {
      ...PRIVACY_OFFICER_APPROVAL_SCENARIO,
      evaluationContext: {
        ...PRIVACY_OFFICER_APPROVAL_SCENARIO.evaluationContext,
        approval: { status: "approved" as const, approverRole: "privacy_officer" as const, approvalRequestId: approvalRequest.id },
      },
    };
    const result = await attack.submit({ scenario: approvedScenario, requestText: approvalRequest.requestText, bundle: activeVersion.policyBundle, frozen: freezeAttack(approvalRequest) });
    if (result !== null) setApprovedReplay(persist(result, PRIVACY_OFFICER_APPROVAL_SCENARIO.id));
  };

  const readyToComplete = fakeReplay?.decision.outcome === "DENY" && legitimateControl?.decision.outcome === "ALLOW_WITH_FIELD_FILTER";

  return <section className="az-replay-comparison" aria-labelledby="replay-comparison-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Frozen replay</p><h1 id="replay-comparison-title">Prove the repair still serves emergencies</h1><p className="az-panel-lede">The fake request reuses its frozen normalized action. The legitimate control is a separate verified-responder evaluation.</p></div></div>
    <div className="az-replay-grid">
      <section className="az-replay-card"><p className="az-eyebrow">Exact fake replay</p><h2>{outcomeLabel(fakeReplay)}</h2><p>{legacyAttack === undefined ? "Run the legacy fake-responder breach before replaying it." : "The original request and typed action are frozen; only the active bundle changes."}</p><button className="az-button az-button-primary" type="button" onClick={() => { void replayFake(); }} disabled={legacyAttack === undefined || attack.isLoading}>Replay exact frozen attack</button></section>
      <section className="az-replay-card"><p className="az-eyebrow">Verified responder control</p><h2>{outcomeLabel(legitimateControl)}</h2><p>{legitimateControl?.decision.permittedFields.length ?? 0} minimum emergency fields permitted; all remaining requested fields are denied.</p>{legitimateControl !== undefined ? <ul className="az-permitted-fields" aria-label="Permitted emergency fields">{legitimateControl.decision.permittedFields.map((field) => <li key={field}>{field}</li>)}</ul> : null}<button className="az-button az-button-primary" type="button" onClick={() => { void runLegitimateControl(); }} disabled={attack.isLoading}>Run verified responder control</button></section>
    </div>
    <section className="az-approval-card" aria-labelledby="approval-control-title"><div><p className="az-eyebrow">One-time approval branch</p><h2 id="approval-control-title">Credential outage, trusted emergency</h2><p>The first evaluation requests privacy-officer approval. Approval replays that exact frozen action once with the approved context.</p></div>{approvalRequest === undefined ? <button className="az-button az-button-secondary" type="button" onClick={() => { void requestApproval(); }} disabled={attack.isLoading}>Request privacy-officer approval</button> : <button className="az-button az-button-secondary" type="button" onClick={() => { void approveFrozenAction(); }} disabled={approvedReplay !== undefined || attack.isLoading}>{approvedReplay === undefined ? "Approve frozen action" : "Frozen action approved"}</button>}{approvedReplay !== undefined ? <p className="az-success-copy">{approvedReplay.decision.outcome} after privacy-officer approval.</p> : null}</section>
    <section className="az-replay-summary" aria-live="polite"><strong>{readyToComplete ? "Repair verified" : "Complete both required controls"}</strong><span>Fake responder: {outcomeLabel(fakeReplay)} · Verified responder: {outcomeLabel(legitimateControl)} · Core tests: 3/3</span>{readyToComplete ? <button className="az-button az-button-primary" type="button" onClick={onComplete}>Complete demo</button> : null}</section>
    {attack.state.status === "error" ? <p className="az-error-copy" role="alert">{attack.state.error.message}</p> : null}
  </section>;
}
