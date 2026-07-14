import { expect, it } from "vitest";

import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { workspaceReducer } from "../../../src/workspace/workspace-reducer";

it("edits a draft child without mutating the active version or input state", () => {
  const state = createSeedWorkspace();
  const active = state.versions.find((version) => version.id === state.activeVersionId);
  const draft = state.versions.find((version) => version.id === state.draftVersionId);
  if (!active || !draft) throw new Error("seed versions missing");

  const next = workspaceReducer(state, { type: "EDIT_CLAUSE", clauseId: "clause.patient-privacy", text: "Updated privacy clause." });

  expect(next.versions.find((version) => version.id === active.id)).toEqual(active);
  expect(next.versions.find((version) => version.id === draft.id)?.clauses.find((clause) => clause.id === "clause.patient-privacy")?.text).toBe("Updated privacy clause.");
  expect(state).toEqual(createSeedWorkspace());
});

it("creates a deterministic draft child when the workspace has none", () => {
  const seed = createSeedWorkspace();
  const active = seed.versions.find((version) => version.id === seed.activeVersionId);
  if (!active) throw new Error("seed active version missing");
  const state = { ...seed, draftVersionId: "missing", versions: [active] };

  const next = workspaceReducer(state, { type: "EDIT_CLAUSE", clauseId: "clause.patient-privacy", text: "New draft." }, () => "draft.fixed");

  expect(next.draftVersionId).toBe("draft.fixed");
  expect(next.versions.find((version) => version.id === "draft.fixed")?.parentVersionId).toBe(active.id);
});
