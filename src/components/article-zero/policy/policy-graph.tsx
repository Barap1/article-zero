"use client";

import { Background, Controls, ReactFlow } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { ConstitutionClause, PolicyIssue, PolicyRule } from "../../../domain/schemas";

type PolicyGraphProps = {
  readonly clauses: readonly ConstitutionClause[];
  readonly rules: readonly PolicyRule[];
  readonly issues: readonly PolicyIssue[];
  readonly onSelectClause: (clauseId: string) => void;
  readonly onSelectRule: (ruleId: string) => void;
  readonly highlightedRuleIds?: readonly string[];
};

type GraphTarget = { readonly kind: "clause" | "rule" | "issue" | "tool"; readonly targetId: string; readonly label: string };

function activeStyle(isActive: boolean): { readonly className: string } | Record<string, never> {
  return isActive ? { className: "az-policy-graph-node-active" } : {};
}

function activeEdgeStyle(isActive: boolean): { readonly animated: true; readonly className: string } | { readonly animated: false } {
  return isActive ? { animated: true, className: "az-policy-graph-edge-active" } : { animated: false };
}

function graphData(clauses: readonly ConstitutionClause[], rules: readonly PolicyRule[], issues: readonly PolicyIssue[], highlightedRuleIds: readonly string[]): { readonly nodes: Node[]; readonly edges: Edge[]; readonly targets: ReadonlyMap<string, GraphTarget> } {
  const highlighted = new Set(highlightedRuleIds);
  const targets = new Map<string, GraphTarget>();
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  clauses.forEach((clause, index) => {
    const id = `clause:${clause.id}`;
    nodes.push({ id, position: { x: 0, y: index * 96 }, data: { label: `Article ${clause.articleNumber}: ${clause.title}` }, type: "input" });
    targets.set(id, { kind: "clause", targetId: clause.id, label: clause.title });
  });
  rules.forEach((rule, index) => {
    const id = `rule:${rule.id}`;
    nodes.push({ id, position: { x: 300, y: index * 132 }, data: { label: rule.name }, ...activeStyle(highlighted.has(rule.id)) });
    targets.set(id, { kind: "rule", targetId: rule.id, label: rule.name });
    edges.push({ id: `compile:${rule.sourceClauseId}:${rule.id}`, source: `clause:${rule.sourceClauseId}`, target: id, label: "compiles", ...activeEdgeStyle(highlighted.has(rule.id)) });
    rule.appliesToTools.forEach((tool, toolIndex) => {
      const toolId = `tool:${tool}`;
      if (!targets.has(toolId)) {
        nodes.push({ id: toolId, position: { x: 610, y: (nodes.length + toolIndex) * 70 }, data: { label: tool }, type: "output" });
        targets.set(toolId, { kind: "tool", targetId: tool, label: tool });
      }
      edges.push({ id: `applies:${rule.id}:${tool}`, source: id, target: toolId, label: "applies", ...activeEdgeStyle(highlighted.has(rule.id)) });
    });
    rule.overridesRuleIds.forEach((targetRuleId) => edges.push({ id: `override:${rule.id}:${targetRuleId}`, source: id, target: `rule:${targetRuleId}`, label: "overrides", animated: false }));
  });
  issues.forEach((issue, index) => {
    const id = `issue:${issue.id}`;
    nodes.push({ id, position: { x: 900, y: index * 108 }, data: { label: `${issue.severity}: ${issue.code}` }, type: "output" });
    targets.set(id, { kind: "issue", targetId: issue.relatedRuleIds[0] ?? "", label: issue.code });
    issue.relatedRuleIds.forEach((ruleId) => edges.push({ id: `finding:${issue.id}:${ruleId}`, source: `rule:${ruleId}`, target: id, label: "finding" }));
  });
  return { nodes, edges, targets };
}

export function PolicyGraph({ clauses, rules, issues, onSelectClause, onSelectRule, highlightedRuleIds = [] }: PolicyGraphProps) {
  const { nodes, edges, targets } = graphData(clauses, rules, issues, highlightedRuleIds);
  const select = (nodeId: string): void => {
    const target = targets.get(nodeId);
    if (!target) return;
    if (target.kind === "clause") onSelectClause(target.targetId);
    if ((target.kind === "rule" || target.kind === "issue") && target.targetId) onSelectRule(target.targetId);
  };
  return <section className="az-policy-graph" aria-labelledby="policy-graph-title">
    <div className="az-section-heading"><div><p className="az-eyebrow">Compiled-policy map</p><h2 id="policy-graph-title">Policy graph</h2></div><span className="az-help-text">Clauses compile into rules; rules apply to tools.</span></div>
    <div className="az-flow-canvas" aria-label="Interactive policy graph"><ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.18 }} minZoom={0.4} maxZoom={1.5} nodesDraggable={false} nodesConnectable={false} nodesFocusable onNodeClick={(_, node) => select(node.id)}><Background color="#c8c0af" gap={24} size={1} /><Controls showInteractive={false} /></ReactFlow></div>
    <section className="az-graph-list" aria-label="Policy graph text alternative"><h3>Graph text alternative</h3><ul>{[...targets.entries()].map(([nodeId, target]) => <li key={nodeId} aria-current={target.kind === "rule" && highlightedRuleIds.includes(target.targetId) ? "step" : undefined}>{target.kind === "tool" ? <span>{target.label}</span> : <button type="button" className="az-text-button" onClick={() => select(nodeId)}>{target.kind}: {target.label}</button>}</li>)}</ul></section>
  </section>;
}
