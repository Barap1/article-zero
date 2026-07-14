import { WorkspaceStateSchema } from "../domain/schemas";
import type { WorkspaceState } from "../domain/schemas";

export function migrateWorkspace(value: unknown): WorkspaceState {
  if (typeof value !== "object" || value === null || !("schemaVersion" in value) || value.schemaVersion !== 1) {
    throw new Error("Unsupported workspace schema version");
  }
  return WorkspaceStateSchema.parse(value);
}
