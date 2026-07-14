import type { WorkspaceState } from "../domain/schemas";

export interface WorkspaceRepository {
  load(): Promise<WorkspaceState | null>;
  save(state: WorkspaceState): Promise<void>;
  reset(): Promise<WorkspaceState>;
  export(state: WorkspaceState): Promise<Blob>;
}
