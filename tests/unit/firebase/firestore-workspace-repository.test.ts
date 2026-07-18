import type { Firestore } from "firebase/firestore";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { FirestoreWorkspaceRepository } from "../../../src/firebase/firestore-workspace-repository";

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join("/") })),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestoreMocks);

const db = {} as Firestore;

afterEach(() => {
  vi.clearAllMocks();
});

describe("FirestoreWorkspaceRepository", () => {
  it("seeds an absent document and saves it at the owner path", async () => {
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => false });
    const seed = createSeedWorkspace();
    const repository = new FirestoreWorkspaceRepository({ db, uid: "user-a", workspaceId: "article-zero-default", seedFactory: () => seed });

    await expect(repository.load()).resolves.toEqual(seed);

    expect(firestoreMocks.doc).toHaveBeenCalledWith(db, "users", "user-a", "workspaces", "article-zero-default");
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(expect.objectContaining({ path: "users/user-a/workspaces/article-zero-default" }), expect.objectContaining({ ownerId: "user-a", workspace: seed, updatedAt: "SERVER_TIMESTAMP" }));
  });

  it("validates existing workspace data before returning it", async () => {
    const workspace = createSeedWorkspace();
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ ownerId: "user-a", workspace, updatedAt: null }) });
    const repository = new FirestoreWorkspaceRepository({ db, uid: "user-a", workspaceId: "article-zero-default", seedFactory: createSeedWorkspace });

    await expect(repository.load()).resolves.toEqual(workspace);
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
  });

  it("rejects invalid cloud data without overwriting it", async () => {
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ ownerId: "user-a", workspace: { invalid: true }, updatedAt: null }) });
    const repository = new FirestoreWorkspaceRepository({ db, uid: "user-a", workspaceId: "article-zero-default", seedFactory: createSeedWorkspace });

    await expect(repository.load()).rejects.toThrow("Stored workspace data is invalid");
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
  });

  it("separates users by document path and persists reset data", async () => {
    const repository = new FirestoreWorkspaceRepository({ db, uid: "user-b", workspaceId: "article-zero-default", seedFactory: createSeedWorkspace });
    const reset = await repository.reset();

    expect(reset).toEqual(createSeedWorkspace());
    expect(firestoreMocks.doc).toHaveBeenLastCalledWith(db, "users", "user-b", "workspaces", "article-zero-default");
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(expect.objectContaining({ path: "users/user-b/workspaces/article-zero-default" }), expect.objectContaining({ ownerId: "user-b" }));
  });
});
