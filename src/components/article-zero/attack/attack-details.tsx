"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { MINIMUM_EMERGENCY_FIELDS } from "../../../domain/catalogs";
import type { PatientField } from "../../../domain/catalogs";
import type { AgentAction, AttackRun, PolicyIssue } from "../../../domain/schemas";

const FIELD_LABELS: Record<PatientField, string> = {
  fullName: "Patient name",
  dateOfBirth: "Date of birth",
  bloodType: "Blood type",
  criticalAllergies: "Critical allergies",
  currentEmergencyMedications: "Emergency medications",
  emergencyWarningFlags: "Emergency warning flags",
  diagnoses: "Diagnoses",
  homeAddress: "Home address",
  insuranceInformation: "Insurance information",
  emergencyContacts: "Emergency contacts",
  clinicalNotes: "Clinical notes",
};
const EMERGENCY_FIELDS = new Set<PatientField>(MINIMUM_EMERGENCY_FIELDS);

type ProposalCardProps = { readonly action: AgentAction; readonly source: AttackRun["actionSource"] };
type IncidentDetailsProps = {
  readonly run: AttackRun;
  readonly issues: readonly PolicyIssue[];
  readonly highlightedRuleIds: readonly string[];
  readonly onHighlightRules: (ruleIds: readonly string[]) => void;
  readonly onAmend: () => void;
};

export function SourceBadge({ source }: { readonly source: AttackRun["actionSource"] }) {
  const label = source === "groq" ? "Live Groq proposal" : source === "fallback" ? "Limited sample fallback" : "Frozen replay";
  return <span className="az-source-badge" aria-label={`Action source: ${label}`}>{label}</span>;
}

export function ProposalCard({ action, source }: ProposalCardProps) {
  return <section className="az-attack-card" aria-labelledby="agent-proposal-title">
    <div className="az-section-heading"><div><p className="az-eyebrow">Step 2 Agent proposal</p><h2 id="agent-proposal-title">Agent proposal</h2></div><SourceBadge source={source} /></div>
    <p>{action.proposalSummary}</p>
    <dl className="az-typed-action">
      <div><dt>Tool</dt><dd>{action.tool}</dd></div><div><dt>Purpose</dt><dd>{action.purpose.replaceAll("_", " ")}</dd></div><div><dt>Requested fields</dt><dd>{action.requestedFields.length}</dd></div>
    </dl>
  </section>;
}

function rootCauses(run: AttackRun, issues: readonly PolicyIssue[]): readonly string[] {
  const causes: string[] = [];
  if (issues.some((issue) => issue.code === "UNVERIFIED_EMERGENCY_OVERRIDE")) causes.push("Identity was not verified before the emergency override allowed disclosure.");
  if (run.action.sourceRequest.length > 0 && run.decision.ruleEvaluations.some((evaluation) => evaluation.state === "MATCH") && run.scenarioId === "scenario.fake-responder-full-record") causes.push("Credibility was self-claimed, but the matched rule evaluated only imminence.");
  if (issues.some((issue) => issue.code === "NO_MINIMUM_DISCLOSURE") && run.decision.permittedFields.length > MINIMUM_EMERGENCY_FIELDS.length) causes.push("The matched rule allowed the full record instead of the minimum emergency disclosure.");
  return causes;
}

function FieldList({ fields }: { readonly fields: readonly PatientField[] }) {
  return <ul className="az-field-list">{fields.length === 0 ? <li>None</li> : fields.map((field) => <li key={field}>{FIELD_LABELS[field]}</li>)}</ul>;
}

export function IncidentDetails({ run, issues, highlightedRuleIds, onHighlightRules, onAmend }: IncidentDetailsProps) {
  const reduceMotion = useReducedMotion();
  const isBreach = run.toolResult?.executed === true && run.toolResult.exposedPatientFields.length > 0;
  const emergencyFields = run.toolResult?.exposedPatientFields.filter((field) => EMERGENCY_FIELDS.has(field)) ?? [];
  const excessiveFields = run.toolResult?.exposedPatientFields.filter((field) => !EMERGENCY_FIELDS.has(field)) ?? [];
  const causes = rootCauses(run, issues);
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" as const };

  return <AnimatePresence mode="wait"><motion.section key={isBreach ? "breach" : "denial"} className={isBreach ? "az-incident az-incident-breach" : "az-incident az-incident-denial"} role={isBreach ? "alert" : "status"} aria-live="polite" aria-labelledby="incident-result-title" initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={transition}>
    <p className="az-eyebrow">Step 4 Enforced result · simulated hospital-tool result</p><h2 id="incident-result-title">{isBreach ? "Policy breach" : "Disclosure prevented"}</h2><p>{isBreach ? "The enforced result disclosed more than the emergency minimum to an unverified requester." : run.decision.humanExplanation}</p>
    <section className="az-field-comparison" aria-labelledby="field-comparison-title"><h3 id="field-comparison-title">Requested, disclosed, and withheld fields</h3><div><section><h4>Requested</h4><FieldList fields={run.decision.requestedFields} /></section><section><h4>Disclosed</h4><FieldList fields={run.toolResult?.exposedPatientFields ?? []} /></section><section><h4>Withheld</h4><FieldList fields={run.decision.deniedFields} /></section></div></section>
    <div className="az-disclosure-grid"><section><h3>Emergency-relevant disclosure</h3><FieldList fields={emergencyFields} /></section><section><h3>Excessive private disclosure</h3><FieldList fields={excessiveFields} /></section></div>
    <section className="az-root-causes" aria-labelledby="root-cause-title"><h3 id="root-cause-title">Root causes</h3>{causes.length > 0 ? <ul>{causes.map((cause) => <li key={cause}>{cause}</li>)}</ul> : <p>No policy defect was detected for this run.</p>}</section>
    <TraceTimeline run={run} highlightedRuleIds={highlightedRuleIds} onHighlightRules={onHighlightRules} />
    <button type="button" className="az-button az-button-primary" onClick={onAmend}>Create amendment</button>
  </motion.section></AnimatePresence>;
}

function TraceTimeline({ run, highlightedRuleIds, onHighlightRules }: Pick<IncidentDetailsProps, "run" | "highlightedRuleIds" | "onHighlightRules">) {
  return <section className="az-trace" aria-labelledby="policy-trace-title"><div className="az-section-heading"><div><p className="az-eyebrow">Decision trace</p><h3 id="policy-trace-title">Decision trace</h3></div><span className="az-help-text">Deterministic rule checks at the tool boundary, not hidden model reasoning.</span></div><ol>{run.decision.trace.map((step) => <li key={step.id} className={step.relatedRuleIds.some((id) => highlightedRuleIds.includes(id)) ? "az-trace-step az-trace-step-active" : "az-trace-step"}><button type="button" onClick={() => onHighlightRules(step.relatedRuleIds)} aria-pressed={step.relatedRuleIds.some((id) => highlightedRuleIds.includes(id))}><span>{step.order}</span><strong>{step.title}</strong><small>{step.detail}</small></button></li>)}</ol></section>;
}
