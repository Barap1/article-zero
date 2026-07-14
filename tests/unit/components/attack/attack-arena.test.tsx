import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { HERO_ATTACK_SCENARIO } from "../../../../src/hospital/fixtures/scenarios";
import { createSeedWorkspace } from "../../../../src/workspace/create-seed-workspace";

const { disclosureToolSpy } = vi.hoisted(() => ({ disclosureToolSpy: vi.fn() }));

vi.mock("../../../../src/hooks/use-run-attack", () => ({
  useRunAttack: () => ({ isLoading: false, state: { status: "idle" }, submit: disclosureToolSpy }),
}));

import { AttackArena } from "../../../../src/components/article-zero/attack/attack-arena";

afterEach(() => {
  cleanup();
  disclosureToolSpy.mockReset();
});

it("shows the fake-responder breach after the protected action is enforced", async () => {
  const workspace = createSeedWorkspace();
  const legacy = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  if (legacy === undefined) throw new Error("The legacy version is required for the hero breach test.");

  disclosureToolSpy.mockResolvedValue({
    source: "fallback",
    action: HERO_ATTACK_SCENARIO.fallbackAction,
    decision: {
      id: "decision.test",
      evaluatedAt: "2026-07-13T12:00:00.000Z",
      actionId: HERO_ATTACK_SCENARIO.fallbackAction.id,
      bundleId: legacy.policyBundle.bundleId,
      outcome: "ALLOW",
      reasonCode: "MATCHED_ALLOW",
      humanExplanation: "The legacy rule allowed disclosure.",
      requestedFields: HERO_ATTACK_SCENARIO.fallbackAction.requestedFields,
      permittedFields: HERO_ATTACK_SCENARIO.fallbackAction.requestedFields,
      deniedFields: [],
      appliedRuleIds: ["rule.legacy-emergency-responder-override"],
      overriddenRuleIds: [],
      ruleEvaluations: [{ ruleId: "rule.legacy-emergency-responder-override", priority: 90, state: "MATCH", conditionResults: [{ ruleId: "rule.legacy-emergency-responder-override", conditionId: "condition.legacy-imminent", fact: "emergency.imminent", operator: "EQUALS", expected: true, actual: true, result: "TRUE", explanation: "Emergency is imminent." }], candidateEffect: "ALLOW", overridden: false, overriddenByRuleId: null }],
      trace: [{ id: "trace.test", order: 1, phase: "TOOL_GATE", status: "pass", title: "Policy gate allowed disclosure", detail: "The legacy rule matched.", relatedRuleIds: ["rule.legacy-emergency-responder-override"] }],
      requiresApproval: false,
      toolExecutionPermitted: true,
    },
    toolResult: { executionId: "execution.test", tool: "disclose_patient_data", executed: true, output: null, exposedPatientFields: HERO_ATTACK_SCENARIO.fallbackAction.requestedFields, executedAt: "2026-07-13T12:00:00.000Z" },
  });

  render(<AttackArena version={legacy} onAddAttackRun={vi.fn()} onAdvanceToAmendment={vi.fn()} />);
  await userEvent.setup().click(screen.getByRole("button", { name: /run protected action/i }));

  expect(await screen.findByText(/policy breach/i)).toBeTruthy();
  expect(screen.getAllByText(/home address/i)).not.toHaveLength(0);
  expect(screen.getByText(/identity was not verified/i)).toBeTruthy();
  expect(disclosureToolSpy).toHaveBeenCalledTimes(1);
});
