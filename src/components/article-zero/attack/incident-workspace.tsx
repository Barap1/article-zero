"use client";

import { useState } from "react";

import type { AttackRun, ConstitutionVersion } from "../../../domain/schemas";
import { analyzePolicyBundle } from "../../../policy-engine/analyze-policy-bundle";
import { PolicyGraph } from "../policy/policy-graph";
import { IncidentDetails } from "./attack-details";

type IncidentWorkspaceProps = {
  readonly version: ConstitutionVersion;
  readonly run: AttackRun | undefined;
  readonly onAmend: () => void;
};

export function IncidentWorkspace({ version, run, onAmend }: IncidentWorkspaceProps) {
  const [highlightedRuleIds, setHighlightedRuleIds] = useState<readonly string[]>(run?.decision.appliedRuleIds ?? []);
  const issues = analyzePolicyBundle(version.policyBundle);

  if (run === undefined) return <section className="az-stage-panel" aria-labelledby="incident-title"><p className="az-eyebrow">Step 4 Enforced result</p><h1 id="incident-title">Incident</h1><p role="alert" className="az-error-copy">Run a synthetic request before opening an incident.</p></section>;

  return <section className="az-incident-workspace" aria-labelledby="incident-title">
    <div className="az-panel-header"><div><p className="az-eyebrow">Enforced result</p><h1 id="incident-title">Incident</h1><p className="az-panel-lede">This view is the selected enforced result. It records what was disclosed or withheld, why the decision occurred, and how the deterministic trace resolved it.</p></div></div>
    <IncidentDetails run={run} issues={issues} highlightedRuleIds={highlightedRuleIds} onHighlightRules={setHighlightedRuleIds} onAmend={onAmend} />
    <details className="az-policy-map"><summary>Show policy map</summary><PolicyGraph clauses={version.clauses} rules={version.policyBundle.rules} issues={issues} onSelectClause={() => undefined} onSelectRule={(ruleId) => setHighlightedRuleIds([ruleId])} highlightedRuleIds={highlightedRuleIds} /></details>
  </section>;
}
