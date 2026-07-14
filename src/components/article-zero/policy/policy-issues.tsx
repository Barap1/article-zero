"use client";

import type { PolicyIssue } from "../../../domain/schemas";

type PolicyIssuesProps = { readonly issues: readonly PolicyIssue[]; readonly onSelectRule: (ruleId: string) => void };

export function PolicyIssues({ issues, onSelectRule }: PolicyIssuesProps) {
  return <section className="az-policy-issues" id="policy-findings" aria-labelledby="policy-issues-title">
    <div className="az-section-heading"><div><p className="az-eyebrow">Static analysis</p><h2 id="policy-issues-title">Findings</h2></div><span className="az-status-chip">{issues.length} open</span></div>
    {issues.length === 0 ? <p className="az-success-copy">No analyzer findings in this proposal.</p> : <ul>{issues.map((issue) => <li key={issue.id} className={`az-issue az-issue-${issue.severity}`}><div><strong>{issue.title}</strong><p>{issue.detail}</p><small>{issue.suggestedResolution}</small></div>{issue.relatedRuleIds[0] ? <button className="az-button az-button-quiet" type="button" onClick={() => onSelectRule(issue.relatedRuleIds[0] ?? "")}>Open affected rule</button> : null}</li>)}</ul>}
  </section>;
}
