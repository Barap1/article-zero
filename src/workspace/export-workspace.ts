import type { WorkspaceState } from "../domain/schemas";
import { canonicalJson, sha256 } from "../lib/canonical-json";
import type { Clock } from "../lib/time";

export async function exportWorkspace(state: WorkspaceState, clock: Clock = () => new Date()): Promise<Blob> {
  const workspaceHash = await sha256(canonicalJson(state));
  return new Blob([JSON.stringify({ exportedAt: clock().toISOString(), applicationVersion: "0.1.0", workspace: state, integrity: { algorithm: "SHA-256", workspaceHash } })], { type: "application/json" });
}
