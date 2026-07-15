import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { analyzePolicyBundle } from "../../../../src/policy-engine/analyze-policy-bundle";
import { createSeedWorkspace } from "../../../../src/workspace/create-seed-workspace";

type MockNode = { readonly id: string; readonly data: { readonly label: string } };
type MockFlowProps = { readonly nodes: readonly MockNode[]; readonly onNodeClick?: (_event: unknown, node: MockNode) => void };

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ nodes, onNodeClick }: MockFlowProps) => <div data-testid="mock-policy-graph">{nodes.map((node) => <button key={node.id} type="button" tabIndex={0} onClick={(event) => onNodeClick?.(event, node)}>{node.data.label}</button>)}</div>,
  Background: () => null,
  Controls: () => null,
}));

import { PolicyGraph } from "../../../../src/components/article-zero/policy/policy-graph";

afterEach(cleanup);

it("keeps the graph description screen-reader-only while nodes stay keyboard-operable", () => {
  const workspace = createSeedWorkspace();
  const draft = workspace.versions.find((version) => version.id === workspace.draftVersionId);
  if (draft === undefined) throw new Error("Seed draft version missing.");

  render(<PolicyGraph clauses={draft.clauses} rules={draft.policyBundle.rules} issues={analyzePolicyBundle(draft.policyBundle)} onSelectClause={vi.fn()} onSelectRule={vi.fn()} />);

  const description = screen.getByText(/Policy graph with/);
  expect(description.classList.contains("az-visually-hidden")).toBe(true);
  expect(screen.getByRole("group", { name: "Interactive policy graph" }).getAttribute("aria-describedby")).toBe(description.id);
  expect(screen.queryByText("Graph text alternative")).toBeNull();
  expect(screen.getAllByRole("button").every((button) => button.tabIndex === 0)).toBe(true);
});
