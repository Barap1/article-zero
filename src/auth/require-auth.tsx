"use client";

import type { ReactNode } from "react";

import { AuthPanel } from "../components/auth/auth-panel";
import { useAuth } from "./auth-provider";

export function RequireAuth({ children }: { readonly children: ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") return <main className="az-shell az-shell-loading"><div className="az-loading-mark" aria-hidden="true" /><p role="status">Checking your workspace…</p></main>;
  if (status !== "authenticated") return <main className="az-auth-route"><AuthPanel /></main>;
  return children;
}
