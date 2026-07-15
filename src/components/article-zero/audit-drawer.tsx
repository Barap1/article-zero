"use client";

import { useMemo, useState } from "react";

import type { AuditEvent } from "../../domain/schemas";
import { formatDisplayLabel } from "../../lib/display-label";

type AuditDrawerProps = {
  readonly events: readonly AuditEvent[];
  readonly onClose: () => void;
  readonly onExport: () => void;
};

const allEvents = "ALL" as const;

export function AuditDrawer({ events, onClose, onExport }: AuditDrawerProps) {
  const [filter, setFilter] = useState<AuditEvent["type"] | typeof allEvents>(allEvents);
  const eventTypes = useMemo(() => [...new Set(events.map((event) => event.type))], [events]);
  const visibleEvents = filter === allEvents ? events : events.filter((event) => event.type === filter);

  const setSelectedFilter = (value: string): void => {
    const selected = eventTypes.find((type) => type === value);
    setFilter(selected ?? allEvents);
  };

  return <aside className="az-audit-drawer" role="dialog" aria-modal="true" aria-labelledby="audit-drawer-title">
    <div className="az-section-heading"><div><p className="az-eyebrow">Exportable evidence</p><h2 id="audit-drawer-title">Audit timeline</h2></div><button className="az-button az-button-quiet" type="button" onClick={onClose}>Close audit</button></div>
    <label className="az-field-label" htmlFor="audit-filter">Filter audit events<select id="audit-filter" value={filter} onChange={(event) => setSelectedFilter(event.target.value)}><option value={allEvents}>All event types</option>{eventTypes.map((type) => <option key={type} value={type}>{formatDisplayLabel(type)}</option>)}</select></label>
    <ol className="az-audit-list">{visibleEvents.map((event) => <li key={event.id}><div><strong>{formatDisplayLabel(event.type)}</strong><span>{event.timestamp} · {formatDisplayLabel(event.source)} · {event.constitutionVersionId ? formatDisplayLabel(event.constitutionVersionId) : "No version"}</span><p>{event.detail}</p></div><details><summary>Typed detail</summary><pre>{JSON.stringify({ relatedIds: event.relatedIds, integrityHash: event.integrityHash }, null, 2)}</pre></details></li>)}</ol>
    {visibleEvents.length === 0 ? <p className="az-help-text">No audit events match this filter.</p> : null}
    <button className="az-button az-button-primary" type="button" onClick={onExport}>Export audit package</button>
  </aside>;
}
