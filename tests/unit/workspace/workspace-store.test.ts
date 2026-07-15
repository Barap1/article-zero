import { expect, it } from "vitest";

import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { createWorkspaceStore, type WorkspaceRepositoryLike } from "../../../src/workspace/workspace-store";

function repositoryWith(value: ReturnType<typeof createSeedWorkspace> | null): WorkspaceRepositoryLike {
  return {
    load: async () => value,
    save: async () => undefined,
    reset: async () => createSeedWorkspace(),
    export: async () => new Blob(["{}"], { type: "application/json" }),
  };
}

it("keeps a valid persisted workspace instead of replacing it with the seed", async () => {
  const persisted = createSeedWorkspace();
  const store = createWorkspaceStore({ repository: repositoryWith({ ...persisted, demoStage: "ATTACK" }) });

  await store.getState().hydrate();

  expect(store.getState().workspace.demoStage).toBe("ATTACK");
  expect(store.getState().hasHydrated).toBe(true);
});

it("prevents duplicate hydration work while the repository is loading", async () => {
  let resolveLoad: ((value: ReturnType<typeof createSeedWorkspace> | null) => void) | undefined;
  const repository: WorkspaceRepositoryLike = {
    load: () => new Promise((resolve) => { resolveLoad = resolve; }),
    save: async () => undefined,
    reset: async () => createSeedWorkspace(),
    export: async () => new Blob(["{}"], { type: "application/json" }),
  };
  const store = createWorkspaceStore({ repository });

  const first = store.getState().hydrate();
  const second = store.getState().hydrate();
  resolveLoad?.(null);
  await Promise.all([first, second]);

  expect(store.getState().hasHydrated).toBe(true);
});

it("blocks direct navigation to a stage whose prerequisites are missing", () => {
  const store = createWorkspaceStore({ seedFactory: createSeedWorkspace });

  store.getState().setDemoStage("REPLAY");

  expect(store.getState().workspace.demoStage).toBe("CONSTITUTION");
});
