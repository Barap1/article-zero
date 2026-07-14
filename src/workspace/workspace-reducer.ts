import type { CompilePreview, ConstitutionClause, PolicyBundle, RevisionPreview, WorkspaceState } from "../domain/schemas";
import type { ConstitutionVersion } from "../domain/schemas";
import { createId, type IdFactory } from "../lib/ids";

export type ActivationTransition = { readonly workspace: WorkspaceState };

export type WorkspaceAction =
  | { readonly type: "EDIT_CLAUSE"; readonly clauseId: string; readonly text: string }
  | { readonly type: "ADD_CLAUSE"; readonly clauseId: string }
  | { readonly type: "ACCEPT_COMPILE_PREVIEW"; readonly clauseId: string; readonly preview: CompilePreview; readonly bundleHash: string }
  | { readonly type: "ACCEPT_REVISION_PREVIEW"; readonly preview: RevisionPreview; readonly bundleHash: string }
  | { readonly type: "ACCEPT_POLICY_BUNDLE"; readonly bundle: PolicyBundle; readonly bundleHash: string; readonly changeSummary: string }
  | { readonly type: "SET_SELECTED_CLAUSE"; readonly clauseId: string }
  | { readonly type: "SET_DEMO_STAGE"; readonly stage: WorkspaceState["demoStage"] }
  | { readonly type: "ADD_ATTACK_RUN"; readonly run: WorkspaceState["attackRuns"][number] }
  | { readonly type: "ADD_TEST_RUN"; readonly run: WorkspaceState["testRuns"][number] }
  | { readonly type: "ACKNOWLEDGE_ISSUE"; readonly issueId: string }
  | { readonly type: "ACTIVATE_VERSION"; readonly result: ActivationTransition }
  | { readonly type: "RESET_WORKSPACE"; readonly state: WorkspaceState };

function draftVersion(state: WorkspaceState, idFactory: IdFactory): ConstitutionVersion {
  const draft = state.versions.find((version) => version.id === state.draftVersionId);
  if (draft) return draft;
  const active = state.versions.find((version) => version.id === state.activeVersionId);
  if (!active) throw new Error("Active workspace version is missing");
  const nextMinorNumber = Number(active.label.match(/v\d+\.(\d+)/)?.[1] ?? 0) + 1;
  return { ...active, id: idFactory(), label: `v${active.label.match(/^v(\d+)/)?.[1] ?? "1"}.${nextMinorNumber} Draft`, status: "DRAFT", activatedAt: null, parentVersionId: active.id, activationTestRunId: null, acknowledgedIssueIds: [], changeSummary: "Editable child draft." };
}

function updateDraft(state: WorkspaceState, update: (draft: ConstitutionVersion) => ConstitutionVersion, idFactory: IdFactory): WorkspaceState {
  const draft = draftVersion(state, idFactory);
  const versions = state.versions.some((version) => version.id === draft.id) ? state.versions.map((version) => version.id === draft.id ? update(version) : version) : [...state.versions, update(draft)];
  return { ...state, draftVersionId: draft.id, versions };
}

function updateClause(version: ConstitutionVersion, clauseId: string, update: (clause: ConstitutionClause) => ConstitutionClause): ConstitutionVersion {
  return { ...version, clauses: version.clauses.map((clause) => clause.id === clauseId ? update(clause) : clause) };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction, idFactory: IdFactory = createId): WorkspaceState {
  switch (action.type) {
    case "EDIT_CLAUSE":
      return updateDraft(state, (draft) => updateClause(draft, action.clauseId, (clause) => ({ ...clause, text: action.text, source: "user", status: "dirty", lastCompiledText: null })), idFactory);
    case "ADD_CLAUSE":
      return updateDraft(state, (draft) => {
        const articleNumber = Math.max(...draft.clauses.map((clause) => clause.articleNumber), 0) + 1;
        return { ...draft, selectedClauseId: action.clauseId, clauses: [...draft.clauses, { id: action.clauseId, articleNumber, title: "New policy article", text: "", source: "user", status: "dirty", lastCompiledText: null }], };
      }, idFactory);
    case "ACCEPT_COMPILE_PREVIEW":
      return updateDraft(state, (draft) => ({ ...updateClause(draft, action.clauseId, (clause) => ({ ...clause, text: action.preview.result.normalizedClause, status: "compiled", lastCompiledText: action.preview.result.normalizedClause })), policyBundle: action.preview.proposedBundle, bundleHash: action.bundleHash, activationTestRunId: null, changeSummary: action.preview.result.interpretationSummary }), idFactory);
    case "ACCEPT_REVISION_PREVIEW":
      return updateDraft(state, (draft) => ({ ...draft, policyBundle: action.preview.proposedBundle, bundleHash: action.bundleHash, activationTestRunId: null, changeSummary: action.preview.result.changeSummary }), idFactory);
    case "ACCEPT_POLICY_BUNDLE":
      return updateDraft(state, (draft) => ({ ...draft, policyBundle: action.bundle, bundleHash: action.bundleHash, activationTestRunId: null, changeSummary: action.changeSummary }), idFactory);
    case "SET_SELECTED_CLAUSE": return { ...state, selectedClauseId: action.clauseId };
    case "SET_DEMO_STAGE": return { ...state, demoStage: action.stage };
    case "ADD_ATTACK_RUN": return { ...state, attackRuns: [...state.attackRuns, action.run], selectedAttackRunId: action.run.id };
    case "ADD_TEST_RUN": return { ...state, testRuns: [...state.testRuns, action.run], selectedTestRunId: action.run.id };
    case "ACKNOWLEDGE_ISSUE": return updateDraft(state, (draft) => ({ ...draft, acknowledgedIssueIds: draft.acknowledgedIssueIds.includes(action.issueId) ? draft.acknowledgedIssueIds : [...draft.acknowledgedIssueIds, action.issueId] }), idFactory);
    case "ACTIVATE_VERSION": return structuredClone(action.result.workspace);
    case "RESET_WORKSPACE": return structuredClone(action.state);
    default: return state;
  }
}
