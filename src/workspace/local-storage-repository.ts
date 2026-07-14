import { WorkspaceStateSchema } from "../domain/schemas";
import type { WorkspaceState } from "../domain/schemas";
import { now, type Clock } from "../lib/time";
import { exportWorkspace } from "./export-workspace";
import { migrateWorkspace } from "./migrations";
import type { WorkspaceRepository } from "./repository";

const STORAGE_KEY = "article-zero:workspace:v1";
const MAX_VERSIONS = 20;
const MAX_ATTACK_RUNS = 50;
const MAX_TEST_RUNS = 20;
const MAX_AUDIT_EVENTS = 500;

type Options = { readonly storage: Storage; readonly seedFactory: () => WorkspaceState; readonly now?: Clock };

function prune(state: WorkspaceState): WorkspaceState {
  const active = state.versions.find((version) => version.id === state.activeVersionId);
  const archived = state.versions.filter((version) => version.status === "ARCHIVED").sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const nonArchivedCount = state.versions.filter((version) => version.status !== "ARCHIVED").length;
  const keepArchived = archived.slice(Math.max(0, archived.length - Math.max(0, MAX_VERSIONS - nonArchivedCount)));
  const versions = state.versions.filter((version) => version.status !== "ARCHIVED" || keepArchived.some((kept) => kept.id === version.id));
  const preservedTestRunId = active?.activationTestRunId;
  const recentTestRuns = state.testRuns.slice(-MAX_TEST_RUNS);
  const testRuns = preservedTestRunId && !recentTestRuns.some((run) => run.id === preservedTestRunId)
    ? [state.testRuns.find((run) => run.id === preservedTestRunId), ...recentTestRuns].filter((run): run is WorkspaceState["testRuns"][number] => run !== undefined).slice(0, MAX_TEST_RUNS)
    : recentTestRuns;
  return { ...state, versions, attackRuns: state.attackRuns.slice(-MAX_ATTACK_RUNS), testRuns, auditEvents: state.auditEvents.slice(-MAX_AUDIT_EVENTS) };
}

export class LocalStorageWorkspaceRepository implements WorkspaceRepository {
  private pending: ReturnType<typeof setTimeout> | undefined;
  private pendingResolve: (() => void) | undefined;
  private readonly clock: Clock;

  public constructor(private readonly options: Options) {
    this.clock = options.now ?? now;
  }

  public async load(): Promise<WorkspaceState | null> {
    const raw = this.options.storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    try {
      return prune(migrateWorkspace(JSON.parse(raw)));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      this.options.storage.setItem(`article-zero:workspace:recovery:${this.clock().toISOString()}`, raw);
      return this.reset();
    }
  }

  public save(state: WorkspaceState): Promise<void> {
    const value = JSON.stringify(WorkspaceStateSchema.parse(prune(structuredClone(state))));
    if (this.pending) clearTimeout(this.pending);
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.pending = setTimeout(() => {
        this.options.storage.setItem(STORAGE_KEY, value);
        this.pending = undefined;
        this.pendingResolve?.();
        this.pendingResolve = undefined;
      }, 250);
    });
  }

  public async reset(): Promise<WorkspaceState> {
    if (this.pending) clearTimeout(this.pending);
    this.pendingResolve?.();
    this.pending = undefined;
    const seed = WorkspaceStateSchema.parse(structuredClone(this.options.seedFactory()));
    this.options.storage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  public export(state: WorkspaceState): Promise<Blob> {
    return exportWorkspace(WorkspaceStateSchema.parse(state), this.clock);
  }
}
