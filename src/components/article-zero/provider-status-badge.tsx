"use client";

import type { WorkspaceState } from "../../domain/schemas";
import { cn } from "../../lib/cn";
import { formatDisplayLabel } from "../../lib/display-label";

type ProviderStatusBadgeProps = {
  readonly source: WorkspaceState["providerStatus"];
};

const LABELS = {
  unknown: `Provider status ${formatDisplayLabel("unknown").toLowerCase()}`,
  configured: `${formatDisplayLabel("groq")} configured`,
  live: `${formatDisplayLabel("live")} ${formatDisplayLabel("groq")}`,
  fallback: `Limited ${formatDisplayLabel("fallback").toLowerCase()}`,
  error: "Provider error",
} as const;

export function ProviderStatusBadge({ source }: ProviderStatusBadgeProps) {
  const isLive = source === "live";
  return (
    <span className={cn("az-provider-badge", isLive && "az-provider-badge-live")} aria-label={`Provider source: ${LABELS[source]}`}>
      <span className="az-status-dot" aria-hidden="true" />
      <span>{LABELS[source]}</span>
    </span>
  );
}
