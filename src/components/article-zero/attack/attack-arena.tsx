"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import type { AttackRun, AuditEvent, ConstitutionVersion } from "../../../domain/schemas";
import { ATTACK_SCENARIOS, HERO_ATTACK_SCENARIO } from "../../../hospital/fixtures/scenarios";
import { useRunAttack } from "../../../hooks/use-run-attack";
import { createId } from "../../../lib/ids";
import { formatDisplayLabel } from "../../../lib/display-label";
import { freezeAttack } from "../../../red-team/freeze-replay";
import { useWorkspaceStore } from "../../../workspace/workspace-store";
import { ProposalCard, SourceBadge } from "./attack-details";

type AttackArenaProps = {
  readonly version: ConstitutionVersion;
  readonly onAddAttackRun: (run: AttackRun) => void;
  readonly onAddAuditEvents?: (events: readonly AuditEvent[]) => void;
  readonly onAdvanceToAmendment?: () => void;
  readonly onViewIncident?: () => void;
  readonly initialRun?: AttackRun;
};

function outcomeLabel(outcome: AttackRun["decision"]["outcome"]): string {
  return formatDisplayLabel(outcome);
}

export function AttackArena({ version, onAddAttackRun, onAddAuditEvents = () => undefined, onViewIncident = () => undefined, initialRun }: AttackArenaProps) {
  const initialScenario = ATTACK_SCENARIOS.find((scenario) => scenario.id === initialRun?.scenarioId) ?? HERO_ATTACK_SCENARIO;
  const [scenarioId, setScenarioId] = useState(initialScenario.id);
  const [requestText, setRequestText] = useState(initialRun?.requestText ?? initialScenario.requestText);
  const [run, setRun] = useState<AttackRun | undefined>(initialRun);
  const [frozenRun, setFrozenRun] = useState<AttackRun | undefined>(initialRun);
  const attack = useRunAttack();
  const reduceMotion = useReducedMotion();
  const setProviderStatus = useWorkspaceStore((state) => state.setProviderStatus);
  const scenario = ATTACK_SCENARIOS.find((candidate) => candidate.id === scenarioId) ?? HERO_ATTACK_SCENARIO;

  const persistRun = (result: NonNullable<Awaited<ReturnType<typeof attack.submit>>>): AttackRun => {
    const completedAt = new Date().toISOString();
    const nextRun: AttackRun = { id: `attack.${createId()}`, scenarioId: scenario.id, constitutionVersionId: version.id, startedAt: completedAt, completedAt, requestText: result.source === "frozen_replay" ? result.action.sourceRequest : requestText, action: result.action, actionSource: result.source, decision: result.decision, toolResult: result.toolResult };
    setRun(nextRun);
    onAddAttackRun(nextRun);
    onAddAuditEvents(result.auditEvents ?? []);
    if (result.source === "groq") setProviderStatus("live");
    if (result.source === "fallback") setProviderStatus("fallback");
    return nextRun;
  };

  const runProtectedAction = async (): Promise<void> => {
    const result = await attack.submit({ scenario, requestText, bundle: version.policyBundle });
    if (result !== null) persistRun(result);
  };

  const replayExactAttack = async (): Promise<void> => {
    if (frozenRun === undefined) return;
    const replayScenario = ATTACK_SCENARIOS.find((candidate) => candidate.id === frozenRun.scenarioId);
    if (replayScenario === undefined) return;
    const result = await attack.submit({ scenario: replayScenario, requestText: frozenRun.requestText, bundle: version.policyBundle, frozen: freezeAttack(frozenRun) });
    if (result !== null) persistRun(result);
  };

  const selectScenario = (nextScenarioId: string): void => {
    const nextScenario = ATTACK_SCENARIOS.find((candidate) => candidate.id === nextScenarioId);
    if (nextScenario === undefined) return;
    setScenarioId(nextScenario.id);
    setRequestText(nextScenario.requestText);
    setRun(undefined);
    setFrozenRun(undefined);
  };

  return <section className="az-attack-arena" aria-labelledby="attack-arena-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Synthetic request scenario</p><h1 id="attack-arena-title">Attack</h1><p className="az-panel-lede">Choose a bounded sample scenario, edit its wording, and inspect the typed proposal before the deterministic policy decision.</p></div><span className="az-status-chip">Sample scenario</span></div>
    <div className="az-attack-layers" aria-label="Attack progression">
      <motion.section className="az-attack-card" initial={{ opacity: 0, x: reduceMotion ? 0 : -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduceMotion ? 0 : 0.22 }} aria-labelledby="attacker-request-title">
        <div className="az-section-heading"><div><p className="az-eyebrow">Step 1 Request</p><h2 id="attacker-request-title">Request</h2></div><span className="az-status-chip">{scenario.name}</span></div>
        <p>{scenario.description}</p>
        <label className="az-field-label" htmlFor="attack-scenario">Synthetic scenario<select id="attack-scenario" value={scenario.id} onChange={(event) => selectScenario(event.target.value)}>{ATTACK_SCENARIOS.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
        <label className="az-field-label" htmlFor="attack-request">Request wording<textarea id="attack-request" aria-label="Request text" value={requestText} onChange={(event) => setRequestText(event.target.value)} /></label>
        <div className="az-inline-actions"><button type="button" className="az-button az-button-primary" onClick={() => { void runProtectedAction(); }} disabled={attack.isLoading}>{attack.isLoading ? "Evaluating policy…" : "Run request"}</button></div>
        <p className="az-help-text">Wording is editable; the selected synthetic actor, patient, context, and field set remain bounded by the scenario.</p>
      </motion.section>
      {run !== undefined ? <ProposalCard action={run.action} source={run.actionSource} /> : <section className="az-attack-card az-attack-card-muted" aria-live="polite"><p className="az-eyebrow">Step 2 Agent proposal</p><h2>Agent proposal</h2><p>Run the request to inspect the typed action before the policy decision.</p></section>}
    </div>
    {run !== undefined ? <section className="az-policy-gate" aria-labelledby="policy-gate-title"><div><p className="az-eyebrow">Step 3 Policy decision</p><h2 id="policy-gate-title">{outcomeLabel(run.decision.outcome)}</h2><p>{run.decision.humanExplanation}</p><p className="az-help-text">The deterministic policy engine checks typed facts and rule conditions at the tool boundary; this is not hidden model reasoning.</p></div><SourceBadge source={run.actionSource} /><div className="az-inline-actions"><button type="button" className="az-button az-button-secondary" onClick={() => setFrozenRun(run)}>Save for replay</button>{frozenRun !== undefined ? <button type="button" className="az-button az-button-secondary" onClick={() => { void replayExactAttack(); }} disabled={attack.isLoading}>Replay saved request</button> : null}<button type="button" className="az-button az-button-primary" onClick={onViewIncident}>View incident</button></div><p className="az-help-text">Incident shows only this enforced result, its disclosed and withheld fields, and the deterministic decision trace.</p></section> : null}
    {attack.state.status === "error" ? <p className="az-error-copy" role="alert">{attack.state.error.message}</p> : null}
  </section>;
}
