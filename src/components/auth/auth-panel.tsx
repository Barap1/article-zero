"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "../../auth/auth-provider";

type AuthPanelProps = { readonly onClose?: () => void };

function authErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "That email or password was not recognized.";
  if (code.includes("email-already-in-use")) return "An account already exists for that email. Try signing in.";
  if (code.includes("popup-closed-by-user")) return "The Google sign-in window was closed before completion.";
  return "Authentication could not be completed. Check your details and try again.";
}

export function AuthPanel({ onClose }: AuthPanelProps) {
  const { status, signInWithGoogle, signInWithEmail, createAccount } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signIn" | "create">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/workspace");
  }, [router, status]);

  const submitEmail = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (email.trim().length === 0 || password.length < 8) {
      setError("Enter an email and a password with at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === "create") await createAccount(email.trim(), password);
      else await signInWithEmail(email.trim(), password);
    } catch (submissionError: unknown) {
      setError(authErrorMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitGoogle = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    try { await signInWithGoogle(); } catch (submissionError: unknown) { setError(authErrorMessage(submissionError)); } finally { setIsSubmitting(false); }
  };

  return <section className="az-auth-panel" aria-labelledby="auth-panel-title">
    <div className="az-auth-panel-heading"><div><p className="az-eyebrow">Article Zero workspace</p><h1 id="auth-panel-title">Sign in to Article Zero</h1><p>Bring policy intent into a workspace that can test it, enforce it, and show its proof.</p></div>{onClose !== undefined ? <button className="az-button az-button-quiet" type="button" onClick={onClose}>Close</button> : null}</div>
    <button className="az-button az-button-google" type="button" onClick={() => { void submitGoogle(); }} disabled={isSubmitting}>Continue with Google</button>
    <div className="az-auth-divider"><span>or use email</span></div>
    <div className="az-auth-tabs" role="tablist" aria-label="Authentication mode"><button className={mode === "signIn" ? "az-auth-tab az-auth-tab-active" : "az-auth-tab"} type="button" role="tab" aria-selected={mode === "signIn"} onClick={() => { setMode("signIn"); setError(null); }}>Sign in</button><button className={mode === "create" ? "az-auth-tab az-auth-tab-active" : "az-auth-tab"} type="button" role="tab" aria-selected={mode === "create"} onClick={() => { setMode("create"); setError(null); }}>Create account</button></div>
    <form className="az-auth-form" onSubmit={(event) => { void submitEmail(event); }}>
      <label className="az-field-label" htmlFor="auth-email">Email<input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="az-field-label" htmlFor="auth-password">Password<input id="auth-password" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error !== null ? <p className="az-error-copy" role="alert">{error}</p> : null}
      <button className="az-button az-button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Working…" : mode === "create" ? "Create account" : "Sign in with email"}</button>
    </form>
    <p className="az-auth-note">Your workspace is private to your Firebase account. The sample hospital records are synthetic.</p>
  </section>;
}
