import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";
import { z } from "zod";

import { WorkspaceStateSchema } from "../domain/schemas";
import type { WorkspaceState } from "../domain/schemas";
import { now, type Clock } from "../lib/time";
import { exportWorkspace } from "../workspace/export-workspace";
import type { WorkspaceRepository } from "../workspace/repository";

const CloudWorkspaceDocumentSchema = z.object({
  ownerId: z.string(),
  workspace: WorkspaceStateSchema,
  updatedAt: z.unknown().optional(),
}).strict();

type Options = {
  readonly db: Firestore;
  readonly uid: string;
  readonly workspaceId: string;
  readonly seedFactory: () => WorkspaceState;
  readonly now?: Clock;
};

export class FirestoreWorkspaceRepository implements WorkspaceRepository {
  private readonly clock: Clock;

  public constructor(private readonly options: Options) {
    this.clock = options.now ?? now;
  }

  private reference() {
    return doc(this.options.db, "users", this.options.uid, "workspaces", this.options.workspaceId);
  }

  public async load(): Promise<WorkspaceState | null> {
    const snapshot = await getDoc(this.reference());
    if (!snapshot.exists()) return this.reset();
    const parsed = CloudWorkspaceDocumentSchema.safeParse(snapshot.data());
    if (!parsed.success || parsed.data.ownerId !== this.options.uid) throw new Error("Stored workspace data is invalid.");
    return parsed.data.workspace;
  }

  public async save(state: WorkspaceState): Promise<void> {
    const workspace = WorkspaceStateSchema.parse(structuredClone(state));
    await setDoc(this.reference(), { ownerId: this.options.uid, workspace, updatedAt: serverTimestamp() });
  }

  public async reset(): Promise<WorkspaceState> {
    const workspace = WorkspaceStateSchema.parse(structuredClone(this.options.seedFactory()));
    await this.save(workspace);
    return workspace;
  }

  public export(state: WorkspaceState): Promise<Blob> {
    return exportWorkspace(WorkspaceStateSchema.parse(state), this.clock);
  }
}
