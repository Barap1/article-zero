"use client";

import { create } from "zustand";

import type { RegressionRemediation } from "../activation/regression-remediation";
import type { AuditEvent, CompilePreview, PolicyBundle, RevisionPreview, WorkspaceState } from "../domain/schemas";
import { hashPolicyBundle } from "../policy-engine/hash-policy-bundle";
import { createId } from "../lib/ids";
import { createSeedWorkspace } from "./create-seed-workspace";
import { LocalStorageWorkspaceRepository } from "./local-storage-repository";
import type { WorkspaceRepository } from "./repository";
import { workspaceReducer, type ActivationTransition, type WorkspaceAction } from "./workspace-reducer";
import { getWorkflowAvailability } from "./workflow-availability";

export type WorkspaceRepositoryLike = WorkspaceRepository;

export type WorkspaceStore = {
  readonly workspace: WorkspaceState;
  readonly hasHydrated: boolean;
  readonly isHydrating: boolean;
  readonly showBriefing: boolean;
  readonly errorMessage: string | null;
  readonly activeRemediation: RegressionRemediation | null;
  readonly hydrate: () => Promise<void>;
  readonly openConstitution: () => void;
  readonly returnHome: () => void;
  readonly startRemediation: (remediation: RegressionRemediation) => void;
  readonly clearRemediation: () => void;
  readonly setDemoStage: (stage: WorkspaceState["demoStage"]) => void;
  readonly selectClause: (clauseId: string) => void;
  readonly editClause: (clauseId: string, text: string) => void;
  readonly editClauseTitle: (clauseId: string, title: string) => void;
  readonly addClause: () => void;
  readonly acceptCompilePreview: (clauseId: string, preview: CompilePreview) => Promise<void>;
  readonly acceptRevisionPreview: (preview: RevisionPreview) => Promise<void>;
  readonly acceptPolicyBundle: (bundle: PolicyBundle, changeSummary: string) => Promise<void>;
  readonly addAttackRun: (run: WorkspaceState["attackRuns"][number]) => void;
  readonly addAuditEvents: (events: readonly AuditEvent[]) => void;
  readonly addTestRun: (run: WorkspaceState["testRuns"][number]) => void;
  readonly acknowledgeIssue: (issueId: string) => void;
  readonly activateVersion: (result: ActivationTransition) => void;
  readonly setProviderStatus: (status: WorkspaceState["providerStatus"]) => void;
  readonly resetDemo: () => Promise<void>;
  readonly exportAuditPackage: () => Promise<Blob>;
};

type CreateWorkspaceStoreOptions = {
  readonly repository?: WorkspaceRepositoryLike;
  readonly seedFactory?: () => WorkspaceState;
};

function memoryRepository(seedFactory: () => WorkspaceState): WorkspaceRepositoryLike {
  let stored: WorkspaceState | null = null;
  return {
    load: async () => stored,
    save: async (state) => { stored = structuredClone(state); },
    reset: async () => { stored = seedFactory(); return structuredClone(stored); },
    export: async () => new Blob([JSON.stringify(stored)], { type: "application/json" }),
  };
}

function defaultRepository(seedFactory: () => WorkspaceState): WorkspaceRepositoryLike {
  if (typeof window === "undefined") return memoryRepository(seedFactory);
  return new LocalStorageWorkspaceRepository({ storage: window.localStorage, seedFactory });
}

function persist(repository: WorkspaceRepositoryLike, set: (partial: Partial<WorkspaceStore>) => void, workspace: WorkspaceState): void {
  void repository.save(workspace).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Workspace persistence failed.";
    set({ errorMessage: message });
  });
}

export function createWorkspaceStore(options: CreateWorkspaceStoreOptions = {}) {
  const seedFactory = options.seedFactory ?? (() => createSeedWorkspace());
  const repository = options.repository ?? defaultRepository(seedFactory);
  let hydrationPromise: Promise<void> | undefined;

  const store = create<WorkspaceStore>((set, get) => {
    const commit = (action: WorkspaceAction): void => {
      const workspace = workspaceReducer(get().workspace, action);
      set({ workspace, errorMessage: null });
      persist(repository, set, workspace);
    };

    return {
      workspace: seedFactory(),
      hasHydrated: false,
      isHydrating: false,
      showBriefing: true,
      errorMessage: null,
      activeRemediation: null,
      hydrate: async () => {
        if (get().hasHydrated) return;
        if (hydrationPromise) return hydrationPromise;
        set({ isHydrating: true, errorMessage: null });
        hydrationPromise = repository.load().then((persisted) => {
          set({ workspace: persisted ?? seedFactory(), hasHydrated: true, isHydrating: false, showBriefing: persisted === null, activeRemediation: null });
        }).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Workspace hydration failed.";
          set({ hasHydrated: false, isHydrating: false, errorMessage: message });
          throw error;
        }).finally(() => { hydrationPromise = undefined; });
        return hydrationPromise;
      },
      openConstitution: () => {
        set({ showBriefing: false });
        commit({ type: "SET_DEMO_STAGE", stage: "CONSTITUTION" });
      },
      returnHome: () => set({ showBriefing: true, activeRemediation: null }),
      startRemediation: (remediation) => set({ activeRemediation: remediation, showBriefing: false }),
      clearRemediation: () => set({ activeRemediation: null }),
      setDemoStage: (stage) => {
        const guidedAmendment = stage === "AMENDMENT" && get().activeRemediation !== null;
        if (!getWorkflowAvailability(get().workspace)[stage].available && !guidedAmendment) return;
        set({ showBriefing: false });
        commit({ type: "SET_DEMO_STAGE", stage });
      },
      selectClause: (clauseId) => commit({ type: "SET_SELECTED_CLAUSE", clauseId }),
      editClause: (clauseId, text) => commit({ type: "EDIT_CLAUSE", clauseId, text }),
      editClauseTitle: (clauseId, title) => commit({ type: "EDIT_CLAUSE_TITLE", clauseId, title }),
      addClause: () => {
        const clauseId = `clause.${createId()}`;
        commit({ type: "ADD_CLAUSE", clauseId });
      },
      acceptCompilePreview: async (clauseId, preview) => {
        const bundleHash = await hashPolicyBundle(preview.proposedBundle);
        commit({ type: "ACCEPT_COMPILE_PREVIEW", clauseId, preview, bundleHash });
      },
      acceptRevisionPreview: async (preview) => {
        const bundleHash = await hashPolicyBundle(preview.proposedBundle);
        commit({ type: "ACCEPT_REVISION_PREVIEW", preview, bundleHash });
      },
      acceptPolicyBundle: async (bundle, changeSummary) => {
        const bundleHash = await hashPolicyBundle(bundle);
        commit({ type: "ACCEPT_POLICY_BUNDLE", bundle, bundleHash, changeSummary });
      },
      addAttackRun: (run) => commit({ type: "ADD_ATTACK_RUN", run }),
      addAuditEvents: (events) => commit({ type: "ADD_AUDIT_EVENTS", events }),
      addTestRun: (run) => commit({ type: "ADD_TEST_RUN", run }),
      acknowledgeIssue: (issueId) => commit({ type: "ACKNOWLEDGE_ISSUE", issueId }),
      activateVersion: (result) => commit({ type: "ACTIVATE_VERSION", result }),
      setProviderStatus: (status) => {
        const workspace = { ...get().workspace, providerStatus: status };
        set({ workspace, errorMessage: null });
        persist(repository, set, workspace);
      },
      resetDemo: async () => {
        const workspace = await repository.reset();
        set({ workspace, hasHydrated: true, isHydrating: false, showBriefing: true, errorMessage: null, activeRemediation: null });
      },
      exportAuditPackage: () => repository.export(get().workspace),
    };
  });

  return store;
}

export const useWorkspaceStore = createWorkspaceStore();

export type WorkspaceStoreApi = typeof useWorkspaceStore;
