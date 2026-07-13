import type { ConstitutionVersion, WorkspaceState } from "../domain/schemas";
import { WorkspaceStateSchema } from "../domain/schemas";
import { CORRECTED_POLICY_BUNDLE, LEGACY_POLICY_BUNDLE, SEED_CLAUSES } from "../hospital/fixtures/constitution";

function version(input: ConstitutionVersion): ConstitutionVersion {
  return input;
}

export function createSeedWorkspace(fixedNow: Date = new Date("2026-07-13T12:00:00.000Z")): WorkspaceState {
  const timestamp = fixedNow.toISOString();
  const legacy = version({ id: "version.legacy-v1", label: "v1.0 — Legacy Emergency Policy", status: "LEGACY_UNSAFE_BASELINE", createdAt: timestamp, activatedAt: null, parentVersionId: null, clauses: [...SEED_CLAUSES], policyBundle: { ...LEGACY_POLICY_BUNDLE, rules: [...LEGACY_POLICY_BUNDLE.rules] }, bundleHash: "seed-hash-legacy-v1", activationTestRunId: null, acknowledgedIssueIds: [], changeSummary: "Seeded legacy unsafe baseline." });
  const draft = version({ id: "version.draft-v1-1", label: "v1.1 Draft", status: "DRAFT", createdAt: timestamp, activatedAt: null, parentVersionId: legacy.id, clauses: [...SEED_CLAUSES], policyBundle: { ...CORRECTED_POLICY_BUNDLE, rules: [...CORRECTED_POLICY_BUNDLE.rules] }, bundleHash: "seed-hash-draft-v1-1", activationTestRunId: null, acknowledgedIssueIds: [], changeSummary: "Editable child of the legacy baseline." });
  const seed: WorkspaceState = { schemaVersion: 1, workspaceId: "workspace.article-zero-seed", activeVersionId: legacy.id, draftVersionId: draft.id, versions: [legacy, draft], attackRuns: [], testRuns: [], approvalRequests: [], auditEvents: [], selectedClauseId: "clause.patient-privacy", selectedAttackRunId: null, selectedTestRunId: null, demoStage: "CONSTITUTION", providerStatus: "fallback" };
  return structuredClone(WorkspaceStateSchema.parse(seed));
}
