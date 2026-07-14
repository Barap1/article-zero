"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import type { AttackRun, AuditEvent, ConstitutionVersion } from "../../../domain/schemas";
import { HERO_ATTACK_SCENARIO } from "../../../hospital/fixtures/scenarios";
import { useRunAttack } from "../../../hooks/use-run-attack";
import { apiClient } from "../../../lib/api-client";
import { createId } from "../../../lib/ids";
import { freezeAttack } from "../../../red-team/freeze-replay";
import { analyzePolicyBundle } from "../../../policy-engine/analyze-policy-bundle";
import { PolicyGraph } from "../policy/policy-graph";
import { IncidentDetails, ProposalCard, SourceBadge } from "./attack-details";

type AttackArenaProps = {
  readonly version: ConstitutionVersion;
  readonly onAddAttackRun: (run: AttackRun) => void;
  readonly onAddAuditEvents?: (events: readonly AuditEvent[]) => void;
  readonly onAdvanceToAmendment: () => void;
  readonly initialRun?: AttackRun;
};

export function AttackArena({ version, onAddAttackRun, onAddAuditEvents = () => undefined, onAdvanceToAmendment, initialRun }: AttackArenaProps) {
  const [requestText, setRequestText] = useState(initialRun?.requestText ?? HERO_ATTACK_SCENARIO.requestText);
  const [run, setRun] = useState<AttackRun | undefined>(initialRun);
  const [frozenRun, setFrozenRun] = useState<AttackRun | undefined>(initialRun);
  const [variationSeed, setVariationSeed] = useState(0);
  const [highlightedRuleIds, setHighlightedRuleIds] = useState<readonly string[]>(initialRun?.decision.appliedRuleIds ?? []);
  const attack = useRunAttack();
  const reduceMotion = useReducedMotion();
  const issues = analyzePolicyBundle(version.policyBundle);

  const persistRun = (result: NonNullable<Awaited<ReturnType<typeof attack.submit>>>): AttackRun => {
    const completedAt = new Date().toISOString();
    const nextRun: AttackRun = { id: `attack.${createId()}`, scenarioId: HERO_ATTACK_SCENARIO.id, constitutionVersionId: version.id, startedAt: completedAt, completedAt, requestText: result.source === "frozen_replay" ? result.action.sourceRequest : requestText, action: result.action, actionSource: result.source, decision: result.decision, toolResult: result.toolResult };
    setRun(nextRun); setHighlightedRuleIds(nextRun.decision.appliedRuleIds); onAddAttackRun(nextRun); onAddAuditEvents(result.auditEvents ?? []);
    return nextRun;
  };

  const runProtectedAction = async (): Promise<void> => {
    const result = await attack.submit({ scenario: HERO_ATTACK_SCENARIO, requestText, bundle: version.policyBundle });
    if (result !== null) persistRun(result);
  };

  const replayExactAttack = async (): Promise<void> => {
    if (frozenRun === undefined) return;
    const result = await attack.submit({ scenario: HERO_ATTACK_SCENARIO, requestText: frozenRun.requestText, bundle: version.policyBundle, frozen: freezeAttack(frozenRun) });
    if (result !== null) persistRun(result);
  };

  const generateVariation = async (): Promise<void> => {
    const response = await apiClient.generateAttackVariation({ scenarioId: HERO_ATTACK_SCENARIO.id, variationSeed: variationSeed + 1 });
    setVariationSeed((seed) => seed + 1);
    setRequestText(response.data.requestText);
  };

  const stageMotion = reduceMotion ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 };
  return <section className="az-attack-arena" aria-labelledby="attack-arena-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Synthetic red-team scenario</p><h1 id="attack-arena-title">Attack arena</h1></div><span className="az-synthetic-context">Known clean demo state</span></div>
    <div className="az-attack-layers" aria-label="Attack progression">
      <motion.section className="az-attack-card" initial={{ opacity: 0, x: reduceMotion ? 0 : -12 }} animate={stageMotion} transition={{ duration: reduceMotion ? 0 : 0.22 }} aria-labelledby="attacker-request-title"><div className="az-section-heading"><div><p className="az-eyebrow">Layer 1</p><h2 id="attacker-request-title">Attacker request</h2></div><span className="az-status-chip">Identity unverified</span></div><p><strong>{HERO_ATTACK_SCENARIO.evaluationContext.actor.displayName}</strong> claims an emergency response role. The incident is self-claimed.</p><label className="az-field-label" htmlFor="attack-request">Request text<textarea id="attack-request" value={requestText} onChange={(event) => setRequestText(event.target.value)} /></label><div className="az-inline-actions"><button type="button" className="az-button az-button-secondary" onClick={() => { void generateVariation(); }} disabled={attack.isLoading}>Generate wording variation</button><button type="button" className="az-button az-button-primary" onClick={() => { void runProtectedAction(); }} disabled={attack.isLoading}>{attack.isLoading ? "Evaluating policy…" : "Run protected action"}</button></div><p className="az-help-text">Changing wording never changes the attacker identity, scenario facts, or requested field set.</p></motion.section>
      {run !== undefined ? <ProposalCard action={run.action} source={run.actionSource} /> : <section className="az-attack-card az-attack-card-muted" aria-live="polite"><p className="az-eyebrow">Layer 2</p><h2>Agent proposal</h2><p>Run the request to inspect the typed action before the policy gate.</p></section>}
    </div>
    {run !== undefined ? <section className="az-policy-gate" aria-labelledby="policy-gate-title"><div><p className="az-eyebrow">Layer 3</p><h2 id="policy-gate-title">Deterministic policy evaluation</h2><p>{run.decision.humanExplanation}</p></div><SourceBadge source={run.actionSource} /><div className="az-inline-actions"><button type="button" className="az-button az-button-secondary" onClick={() => setFrozenRun(run)}>Freeze attack</button>{frozenRun !== undefined ? <button type="button" className="az-button az-button-secondary" onClick={() => { void replayExactAttack(); }} disabled={attack.isLoading}>Replay exact attack</button> : null}</div><p className="az-help-text">{frozenRun === undefined ? "Freeze stores this exact normalized request and action for deterministic replay." : "The frozen request and normalized action are ready for replay."}</p></section> : null}
    {run !== undefined ? <IncidentDetails run={run} issues={issues} highlightedRuleIds={highlightedRuleIds} onHighlightRules={setHighlightedRuleIds} onAmend={onAdvanceToAmendment} /> : null}
    {run !== undefined ? <PolicyGraph clauses={version.clauses} rules={version.policyBundle.rules} issues={issues} onSelectClause={() => undefined} onSelectRule={(ruleId) => setHighlightedRuleIds([ruleId])} highlightedRuleIds={highlightedRuleIds} /> : null}
    {attack.state.status === "error" ? <p className="az-error-copy" role="alert">{attack.state.error.message}</p> : null}
  </section>;
}
