"use client";

import { Download, RotateCcw, ShieldCheck } from "lucide-react";

import type { WorkspaceState } from "../../domain/schemas";
import { ProviderStatusBadge } from "./provider-status-badge";

type AppHeaderProps = {
  readonly workspace: WorkspaceState;
  readonly onReset: () => void;
  readonly onExport: () => void;
  readonly isExporting: boolean;
};

function providerSource(status: WorkspaceState["providerStatus"]): "deterministic" | "groq" | "fallback" {
  if (status === "live") return "groq";
  if (status === "fallback") return "fallback";
  return "deterministic";
}

export function AppHeader({ workspace, onReset, onExport, isExporting }: AppHeaderProps) {
  const activeVersion = workspace.versions.find((version) => version.id === workspace.activeVersionId);
  const legacyRisk = activeVersion?.status === "LEGACY_UNSAFE_BASELINE";

  return (
    <header className="az-header">
      <div className="az-brand-lockup">
        <div className="az-seal" aria-hidden="true"><ShieldCheck size={19} strokeWidth={1.8} /></div>
        <div>
          <p className="az-eyebrow">Article Zero</p>
          <p className="az-brand-subtitle">Constitutional command center</p>
        </div>
      </div>
      <div className="az-header-context">
        <div className="az-version-context">
          <span className="az-context-label">Active version</span>
          <span className={legacyRisk ? "az-version-badge az-version-risk" : "az-version-badge"}>{activeVersion?.label ?? "Unavailable"}</span>
          {legacyRisk && <span className="az-risk-label">Legacy risk</span>}
        </div>
        <ProviderStatusBadge source={providerSource(workspace.providerStatus)} />
        <span className="az-synthetic-context"><span className="az-status-dot az-status-dot-synthetic" aria-hidden="true" />Synthetic data only</span>
        <div className="az-header-actions">
          <button className="az-button az-button-quiet" type="button" onClick={onExport} disabled={isExporting}>
            <Download size={15} aria-hidden="true" />
            {isExporting ? "Preparing…" : "Export audit"}
          </button>
          <button className="az-button az-button-quiet" type="button" onClick={onReset}>
            <RotateCcw size={15} aria-hidden="true" />
            Reset demo
          </button>
        </div>
      </div>
    </header>
  );
}
