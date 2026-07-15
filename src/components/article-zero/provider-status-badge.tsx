"use client";

import type { WorkspaceState } from "../../domain/schemas";
import { cn } from "../../lib/cn";

type ProviderStatusBadgeProps = {
  readonly source: WorkspaceState["providerStatus"];
};

const LABELS = {
  unknown: "Provider status unknown",
  configured: "Groq configured",
  live: "Live Groq",
  fallback: "Limited sample fallback",
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
