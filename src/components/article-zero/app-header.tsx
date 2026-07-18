"use client";

import Image from "next/image";
import { ClipboardList, Download, RotateCcw } from "lucide-react";
import { useAuth } from "../../auth/auth-provider";

type AppHeaderProps = {
  readonly onReturnHome: () => void;
  readonly onReset: () => void;
  readonly onExport: () => void;
  readonly onOpenAudit: () => void;
  readonly isExporting: boolean;
};

export function AppHeader({ onReturnHome, onReset, onExport, onOpenAudit, isExporting }: AppHeaderProps) {
  const { user, signOutUser } = useAuth();
  const accountLabel = user?.displayName ?? user?.email ?? "Test workspace";
  return (
    <header className="az-header">
      <button className="az-brand-lockup az-brand-button" type="button" onClick={onReturnHome} aria-label="Article Zero, return home">
        <Image className="az-seal" src="/generated/article-zero-seal.webp" width={48} height={48} alt="" priority />
        <span>
          <span className="az-eyebrow">Article Zero</span>
          <span className="az-brand-subtitle">Constitutional policy workspace</span>
        </span>
      </button>
      <div className="az-header-actions">
          <button className="az-button az-button-quiet" type="button" onClick={onOpenAudit} aria-label="Open audit timeline" title="Open audit timeline"><ClipboardList size={15} aria-hidden="true" /><span className="az-button-label">Audit</span></button>
          <button className="az-button az-button-quiet" type="button" onClick={onExport} disabled={isExporting} aria-label={isExporting ? "Preparing audit export" : "Export audit package"} title="Export audit package">
            <Download size={15} aria-hidden="true" />
            <span className="az-button-label">{isExporting ? "Preparing…" : "Export"}</span>
          </button>
          <button className="az-button az-button-quiet" type="button" onClick={onReset} aria-label="Reset workspace" title="Reset workspace">
            <RotateCcw size={15} aria-hidden="true" />
            <span className="az-button-label">Reset</span>
          </button>
          <details className="az-user-menu">
            <summary className="az-user-trigger"><span className="az-user-avatar" aria-hidden="true">{accountLabel.slice(0, 1).toUpperCase()}</span><span className="az-user-label">{accountLabel}</span></summary>
            <div className="az-user-popover"><p className="az-eyebrow">Signed-in workspace</p><strong>{accountLabel}</strong><button className="az-button az-button-secondary" type="button" onClick={() => { void signOutUser(); }}>Sign out</button></div>
          </details>
      </div>
    </header>
  );
}
