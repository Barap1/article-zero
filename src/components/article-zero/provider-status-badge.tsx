"use client";

import type { ApiSource } from "../../domain/api";
import { cn } from "../../lib/cn";

type ProviderStatusBadgeProps = {
  readonly source: ApiSource | "frozen_replay";
};

const LABELS = {
  deterministic: "Deterministic",
  groq: "Live Groq",
  fallback: "Deterministic Fallback",
  frozen_replay: "Frozen Replay",
} as const;

export function ProviderStatusBadge({ source }: ProviderStatusBadgeProps) {
  const isLive = source === "groq";
  return (
    <span className={cn("az-provider-badge", isLive && "az-provider-badge-live")} aria-label={`Provider source: ${LABELS[source]}`}>
      <span className="az-status-dot" aria-hidden="true" />
      <span>{LABELS[source]}</span>
    </span>
  );
}
