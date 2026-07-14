"use client";

import type { ConstitutionClause } from "../../../domain/schemas";

type ClauseListProps = {
  readonly clauses: readonly ConstitutionClause[];
  readonly selectedClauseId: string;
  readonly onSelect: (clauseId: string) => void;
  readonly onAdd: () => void;
};

export function ClauseList({ clauses, selectedClauseId, onSelect, onAdd }: ClauseListProps) {
  return <nav aria-label="Constitution articles" className="az-clause-list">
    <div className="az-section-heading"><div><p className="az-eyebrow">Human policy</p><h2>Articles</h2></div><button className="az-button az-button-quiet" type="button" onClick={onAdd}>Add article</button></div>
    <ol>
      {clauses.map((clause) => <li key={clause.id}>
        <button className={`az-clause-item ${clause.id === selectedClauseId ? "az-clause-item-selected" : ""}`} type="button" onClick={() => onSelect(clause.id)} aria-current={clause.id === selectedClauseId ? "true" : undefined}>
          <span className="az-clause-number">{String(clause.articleNumber).padStart(2, "0")}</span>
          <span><strong>{clause.title}</strong><small>{clause.status === "dirty" ? "Draft changed" : clause.status}</small></span>
          {clause.id === "clause.emergency-response" ? <span className="az-risk-label">Unsafe baseline</span> : null}
        </button>
      </li>)}
    </ol>
  </nav>;
}
