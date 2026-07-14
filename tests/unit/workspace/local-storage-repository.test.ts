import { expect, it } from "vitest";

import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { canonicalJson, sha256 } from "../../../src/lib/canonical-json";
import { LocalStorageWorkspaceRepository } from "../../../src/workspace/local-storage-repository";
import { exportWorkspace } from "../../../src/workspace/export-workspace";

class FakeStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

it("round-trips valid state and restores a seed after corrupt data", async () => {
  const storage = new FakeStorage();
  const now = () => new Date("2026-07-13T12:00:00.000Z");
  const seed = createSeedWorkspace(now());
  const repository = new LocalStorageWorkspaceRepository({ storage, seedFactory: () => seed, now });

  await repository.save(seed);
  expect(await repository.load()).toEqual(seed);
  storage.setItem("article-zero:workspace:v1", "{broken");

  expect(await repository.load()).toEqual(seed);
  expect(storage.getItem("article-zero:workspace:recovery:2026-07-13T12:00:00.000Z")).toBe("{broken");
});

it("prunes only archived versions and preserves the active version", async () => {
  const storage = new FakeStorage();
  const seed = createSeedWorkspace();
  const versions = Array.from({ length: 21 }, (_, index) => ({ ...seed.versions[0]!, id: `archived-${index}`, status: "ARCHIVED" as const, createdAt: new Date(2026, 0, index + 1).toISOString() }));
  const state = { ...seed, versions: [seed.versions[0]!, ...versions] };
  const repository = new LocalStorageWorkspaceRepository({ storage, seedFactory: createSeedWorkspace, now: () => new Date("2026-07-13T12:00:00.000Z") });

  await repository.save(state);
  const loaded = await repository.load();
  expect(loaded?.versions).toHaveLength(20);
  expect(loaded?.versions.some((version) => version.id === seed.activeVersionId)).toBe(true);
  expect(loaded?.versions.some((version) => version.id === "archived-0")).toBe(false);
});

it("exports a workspace with a matching SHA-256 hash", async () => {
  const workspace = createSeedWorkspace();
  const blob = await exportWorkspace(workspace);
  const exported = JSON.parse(await blob.text()) as { workspace: typeof workspace; integrity: { workspaceHash: string } };
  const hash = await sha256(canonicalJson(exported.workspace));
  expect(exported.integrity.workspaceHash).toBe(hash);
});
