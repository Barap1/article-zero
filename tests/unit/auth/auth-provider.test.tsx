import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));
const workspaceStoreMock = vi.hoisted(() => {
  const store = vi.fn((selector: (state: { connectRepository: () => Promise<void>; disconnectRepository: () => void }) => unknown) => selector({ connectRepository: async () => undefined, disconnectRepository: () => undefined }));
  return store;
});

vi.mock("firebase/auth", () => authMocks);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(), serverTimestamp: vi.fn(), setDoc: vi.fn() }));
vi.mock("../../../src/firebase/client", () => ({ getFirebaseClient: () => ({ auth: {}, db: {} }) }));
vi.mock("../../../src/firebase/user-profile", () => ({ upsertUserProfile: vi.fn() }));
vi.mock("../../../src/firebase/firestore-workspace-repository", () => ({ FirestoreWorkspaceRepository: vi.fn() }));
vi.mock("../../../src/workspace/workspace-store", () => ({ useWorkspaceStore: workspaceStoreMock }));

import { AuthProvider, useAuth } from "../../../src/auth/auth-provider";

function AuthProbe() {
  const auth = useAuth();
  return <><p>{auth.status}</p><button type="button" onClick={() => { void auth.signInWithGoogle(); }}>Google</button><button type="button" onClick={() => { void auth.signInWithEmail("person@example.test", "password123"); }}>Email</button></>;
}

afterEach(cleanup);

describe("AuthProvider", () => {
  beforeEach(() => {
    authMocks.onAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: User | null) => void) => {
      callback(null);
      return vi.fn();
    });
  });

  it("subscribes to Firebase auth state and exposes sign-in actions", async () => {
    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("unauthenticated")).toBeTruthy());

    await userEvent.click(screen.getByRole("button", { name: "Google" }));
    await userEvent.click(screen.getByRole("button", { name: "Email" }));

    expect(authMocks.signInWithPopup).toHaveBeenCalled();
    expect(authMocks.signInWithEmailAndPassword).toHaveBeenCalledWith({}, "person@example.test", "password123");
  });
});
