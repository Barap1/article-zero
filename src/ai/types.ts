import "server-only";

import type { ConstitutionClause, PolicyBundle, PolicyRule, ActorContext, AgentAction, AttackScenario, CompileResult, RevisionResult } from "../domain/schemas";
import type { TOOL_NAMES } from "../domain/catalogs";

export interface AiCallMeta {
  readonly requestId: string;
  readonly model: string;
  readonly durationMs: number;
  readonly source: "groq" | "fallback";
}

export interface AiResult<T> {
  readonly data: T;
  readonly meta: AiCallMeta;
}

export interface AiProvider {
  compileClause(input: { readonly clause: ConstitutionClause; readonly existingBundle: PolicyBundle }): Promise<AiResult<CompileResult>>;
  revisePolicy(input: { readonly instruction: string; readonly selectedRules: readonly PolicyRule[]; readonly existingBundle: PolicyBundle }): Promise<AiResult<RevisionResult>>;
  planAction(input: { readonly requestText: string; readonly actor: ActorContext; readonly patientId: string; readonly allowedTools: readonly (typeof TOOL_NAMES)[number][] }): Promise<AiResult<AgentAction>>;
  generateAttackVariation(input: { readonly scenario: AttackScenario; readonly variationSeed: number }): Promise<AiResult<{ readonly requestText: string }>>;
}
