import "server-only";

import { z } from "zod";

import { AgentActionSchema, CompileResultSchema, RevisionResultSchema } from "../domain/schemas";

export const AttackVariationSchema = z.strictObject({ requestText: z.string() });

export const AI_OUTPUT_SCHEMAS = {
  compileClause: CompileResultSchema,
  revisePolicy: RevisionResultSchema,
  planAction: AgentActionSchema,
  generateAttackVariation: AttackVariationSchema,
} as const;

export function jsonSchemaFor(schema: z.ZodType) {
  return z.toJSONSchema(schema);
}
