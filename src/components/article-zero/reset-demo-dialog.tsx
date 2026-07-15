"use client";

import { useEffect, useRef } from "react";

type ResetDemoDialogProps = {
  readonly open: boolean;
  readonly isResetting: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
};

export function ResetDemoDialog({ open, isResetting, onCancel, onConfirm }: ResetDemoDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>("button");
    firstButton?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); return; }
      if (event.key !== "Tab" || dialogRef.current === null) return;
      const buttons = [...dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, open]);

  if (!open) return null;
  return (
    <div className="az-dialog-backdrop" role="presentation">
      <div className="az-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-demo-title" ref={dialogRef}>
        <span className="az-dialog-kicker">Reset workspace</span>
        <h2 id="reset-demo-title">Start a fresh sample workspace?</h2>
        <p>This removes local edits, attack runs, test runs, and audit events from this browser. The seeded policy workspace will be restored.</p>
        <div className="az-dialog-actions">
          <button className="az-button az-button-secondary" type="button" onClick={onCancel} disabled={isResetting}>Keep workspace</button>
          <button className="az-button az-button-danger" type="button" onClick={onConfirm} disabled={isResetting}>{isResetting ? "Resetting…" : "Reset workspace"}</button>
        </div>
      </div>
    </div>
  );
}
