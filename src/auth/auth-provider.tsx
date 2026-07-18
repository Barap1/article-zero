"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";

import { FirestoreWorkspaceRepository } from "../firebase/firestore-workspace-repository";
import { getFirebaseClient } from "../firebase/client";
import { upsertUserProfile } from "../firebase/user-profile";
import { createSeedWorkspace } from "../workspace/create-seed-workspace";
import { useWorkspaceStore } from "../workspace/workspace-store";

export type AuthContextValue = {
  readonly user: User | null;
  readonly status: "loading" | "authenticated" | "unauthenticated";
  readonly signInWithGoogle: () => Promise<void>;
  readonly signInWithEmail: (email: string, password: string) => Promise<void>;
  readonly createAccount: (email: string, password: string) => Promise<void>;
  readonly signOutUser: () => Promise<void>;
};

const noop = async (): Promise<void> => undefined;
const defaultAuth: AuthContextValue = { user: null, status: "unauthenticated", signInWithGoogle: noop, signInWithEmail: noop, createAccount: noop, signOutUser: noop };
const AuthContext = createContext<AuthContextValue>(defaultAuth);
const e2eBypass = process.env.NODE_ENV !== "production" && process.env["NEXT_PUBLIC_E2E_AUTH_BYPASS"] === "true";

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const connectRepository = useWorkspaceStore((state) => state.connectRepository);
  const disconnectRepository = useWorkspaceStore((state) => state.disconnectRepository);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>(e2eBypass ? "authenticated" : "loading");

  useEffect(() => {
    if (e2eBypass) return;
    let active = true;
    try {
      const { auth, db } = getFirebaseClient();
      const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        void (async () => {
          if (!active) return;
          setStatus("loading");
          if (nextUser === null) {
            disconnectRepository();
            setUser(null);
            if (active) setStatus("unauthenticated");
            return;
          }
          try {
            await upsertUserProfile(db, nextUser);
            await connectRepository(new FirestoreWorkspaceRepository({ db, uid: nextUser.uid, workspaceId: "article-zero-default", seedFactory: createSeedWorkspace }));
            if (active) {
              setUser(nextUser);
              setStatus("authenticated");
            }
          } catch {
            disconnectRepository();
            if (active) {
              setUser(null);
              setStatus("unauthenticated");
            }
          }
        })();
      });
      return () => { active = false; unsubscribe(); };
    } catch {
      setStatus("unauthenticated");
      return () => { active = false; };
    }
  }, [connectRepository, disconnectRepository]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    signInWithGoogle: async () => {
      const { auth } = getFirebaseClient();
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    signInWithEmail: async (email, password) => {
      const { auth } = getFirebaseClient();
      await signInWithEmailAndPassword(auth, email, password);
    },
    createAccount: async (email, password) => {
      const { auth } = getFirebaseClient();
      await createUserWithEmailAndPassword(auth, email, password);
    },
    signOutUser: async () => {
      if (e2eBypass) {
        disconnectRepository();
        setUser(null);
        setStatus("unauthenticated");
        router.push("/");
        return;
      }
      const { auth } = getFirebaseClient();
      await signOut(auth);
      disconnectRepository();
      setUser(null);
      setStatus("unauthenticated");
      router.push("/");
    },
  }), [disconnectRepository, router, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
