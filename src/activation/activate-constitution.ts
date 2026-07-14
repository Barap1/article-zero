import type { ConstitutionVersion, PolicyIssue, WorkspaceState } from "../domain/schemas";
import { WorkspaceStateSchema } from "../domain/schemas";
import { createId } from "../lib/ids";
import { hashPolicyBundle } from "../policy-engine/hash-policy-bundle";
import { assessActivation } from "./assess-activation";

export interface ActivationTransition {
  readonly workspace: WorkspaceState;
  readonly activatedVersionId: string;
  readonly archivedVersionId: string;
  readonly newDraftVersionId: string;
  readonly auditEventId: string;
}

export class ActivationPreconditionError extends Error {
  readonly reasonCodes: readonly string[];

  constructor(reasonCodes: readonly string[]) {
    super(`Activation is blocked: ${reasonCodes.join(", ")}.`);
    this.name = "ActivationPreconditionError";
    this.reasonCodes = reasonCodes;
  }
}

function freshDraft(version: ConstitutionVersion, id: string, createdAt: string): ConstitutionVersion {
  return {
    ...version,
    id,
    label: `${version.label} Draft`,
    status: "DRAFT",
    createdAt,
    activatedAt: null,
    parentVersionId: version.id,
    clauses: version.clauses.map((clause) => ({ ...clause, status: "clean" })),
    activationTestRunId: null,
    acknowledgedIssueIds: [],
    changeSummary: "Editable child draft.",
  };
}

export async function activateConstitution(input: {
  readonly workspace: WorkspaceState;
  readonly draftVersionId: string;
  readonly issues: readonly PolicyIssue[];
  readonly now?: () => Date;
  readonly idFactory?: () => string;
}): Promise<ActivationTransition> {
  const workspace = WorkspaceStateSchema.parse(input.workspace);
  const draft = workspace.versions.find((version) => version.id === input.draftVersionId);
  const archived = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  if (!draft || draft.status !== "DRAFT") throw new ActivationPreconditionError(["NO_DRAFT"]);
  if (!archived) throw new ActivationPreconditionError(["NO_ACTIVE_VERSION"]);

  const recalculatedDraft = { ...draft, bundleHash: await hashPolicyBundle(draft.policyBundle) };
  const latestTestRun = [...workspace.testRuns].reverse().find((run) => run.constitutionVersionId === draft.id) ?? null;
  const assessment = assessActivation({ draft: recalculatedDraft, issues: input.issues, latestTestRun });
  if (!assessment.canActivate) throw new ActivationPreconditionError(assessment.blockingReasonCodes);
  if (latestTestRun === null) throw new ActivationPreconditionError(["NO_TEST_RUN"]);

  const now = input.now ?? (() => new Date());
  const idFactory = input.idFactory ?? createId;
  const activatedAt = now().toISOString();
  const child = freshDraft(recalculatedDraft, `version.${idFactory()}`, activatedAt);
  const auditEventId = `audit.${idFactory()}`;
  const activated: ConstitutionVersion = {
    ...recalculatedDraft,
    status: "ACTIVE",
    activatedAt,
    activationTestRunId: latestTestRun.id,
  };
  const nextWorkspace = WorkspaceStateSchema.parse({
    ...workspace,
    activeVersionId: activated.id,
    draftVersionId: child.id,
    versions: [...workspace.versions.map((version) => {
      if (version.id === archived.id) return { ...version, status: "ARCHIVED" };
      if (version.id === activated.id) return activated;
      return version;
    }), child],
    auditEvents: [...workspace.auditEvents, {
      id: auditEventId,
      timestamp: activatedAt,
      type: "CONSTITUTION_ACTIVATED",
      actorLabel: "user",
      constitutionVersionId: activated.id,
      relatedIds: [activated.id, latestTestRun.id],
      detail: `Activated ${activated.label} after passing regression tests.`,
      source: "user",
      integrityHash: `integrity.${auditEventId}`,
    }],
  });

  return {
    workspace: nextWorkspace,
    activatedVersionId: activated.id,
    archivedVersionId: archived.id,
    newDraftVersionId: child.id,
    auditEventId,
  };
}
