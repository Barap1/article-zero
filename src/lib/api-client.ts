import {
  AgentActionResponseSchema,
  AttackVariationResponseSchema,
  CompilePreviewResponseSchema,
  ExecuteRequestSchema,
  EvaluateRequestSchema,
  HealthResponseSchema,
  PlanActionRequestSchema,
  RevisionPreviewResponseSchema,
  CompileRequestSchema,
  RevisionRequestSchema,
  AttackVariationRequestSchema,
} from "../domain/api";
import type { ApiErrorCode, ApiSource } from "../domain/api";
import {
  AgentActionSchema,
  AuditEventSchema,
  PolicyDecisionSchema,
  ToolExecutionResultSchema,
} from "../domain/schemas";
import type {
  AgentAction,
  AuditEvent,
  CompilePreview,
  EvaluationContext,
  PolicyBundle,
  PolicyDecision,
  RevisionPreview,
  ToolExecutionResult,
} from "../domain/schemas";
import { z } from "zod";

const EnforcedActionResultSchema = z.strictObject({
  action: AgentActionSchema,
  decision: PolicyDecisionSchema,
  toolResult: ToolExecutionResultSchema.nullable(),
  auditEvents: z.array(AuditEventSchema),
});

const PolicyDecisionResponseSchema = z.strictObject({ ok: z.literal(true), data: PolicyDecisionSchema, meta: z.object({ requestId: z.string(), durationMs: z.number(), source: z.enum(["deterministic", "groq", "fallback"]) }) });
const EnforcedActionResponseSchema = z.strictObject({ ok: z.literal(true), data: EnforcedActionResultSchema, meta: z.object({ requestId: z.string(), durationMs: z.number(), source: z.enum(["deterministic", "groq", "fallback"]) }) });

export type ApiSuccess<T> = {
  readonly ok: true;
  readonly data: T;
  readonly meta: {
    readonly requestId: string;
    readonly durationMs: number;
    readonly source: ApiSource;
  };
};

export type EnforcedActionResult = {
  readonly action: AgentAction;
  readonly decision: PolicyDecision;
  readonly toolResult: ToolExecutionResult | null;
  readonly auditEvents: readonly AuditEvent[];
};

export class ApiClientError extends Error {
  public override readonly name = "ApiClientError";

  public constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly requestId: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ApiClientOptions = {
  readonly baseUrl?: string;
  readonly fetcher?: Fetcher;
};

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;

  public constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "";
    this.fetcher = options.fetcher ?? fetch;
  }

  private async request<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<ApiSuccess<T>> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, init);
    } catch (error) {
      if (error instanceof Error) throw new ApiClientError("PROVIDER_UNAVAILABLE", "The Article Zero service is unavailable.", true, "unknown", 0);
      throw error;
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch (error) {
      if (error instanceof Error) throw new ApiClientError("INTERNAL_ERROR", "The service returned an invalid response.", false, "unknown", response.status);
      throw error;
    }

    const failure = z.object({ ok: z.literal(false), error: z.strictObject({ code: z.enum(["INVALID_REQUEST", "PROVIDER_UNAVAILABLE", "PROVIDER_RATE_LIMITED", "PROVIDER_INVALID_OUTPUT", "POLICY_INVALID", "ACTION_DENIED", "INTERNAL_ERROR"]), message: z.string(), retryable: z.boolean(), requestId: z.string() }) }).safeParse(raw);
    if (!response.ok || failure.success) {
      if (failure.success) throw new ApiClientError(failure.data.error.code, failure.data.error.message, failure.data.error.retryable, failure.data.error.requestId, response.status);
      throw new ApiClientError("INTERNAL_ERROR", "The service could not complete the request.", false, "unknown", response.status);
    }

    const parsed = z.strictObject({
      ok: z.literal(true),
      data: schema,
      meta: z.strictObject({ requestId: z.string(), durationMs: z.number().nonnegative(), source: z.enum(["deterministic", "groq", "fallback"]) }),
    }).safeParse(raw);
    if (!parsed.success) throw new ApiClientError("INTERNAL_ERROR", "The service returned data outside its contract.", false, "unknown", response.status);
    return { ok: true, data: parsed.data.data, meta: parsed.data.meta };
  }

  private post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<ApiSuccess<T>> {
    return this.request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, schema);
  }

  public async health(): Promise<ApiSuccess<z.infer<typeof HealthResponseSchema>["data"]>> {
    const response = await this.request("/api/health", { method: "GET" }, HealthResponseSchema.shape.data);
    return response;
  }

  public async compileClause(input: z.infer<typeof CompileRequestSchema>): Promise<ApiSuccess<CompilePreview>> {
    return this.post("/api/compile", input, CompilePreviewResponseSchema.shape.data);
  }

  public async revisePolicy(input: z.infer<typeof RevisionRequestSchema>): Promise<ApiSuccess<RevisionPreview>> {
    return this.post("/api/revise-policy", input, RevisionPreviewResponseSchema.shape.data);
  }

  public async planAction(input: z.infer<typeof PlanActionRequestSchema>): Promise<ApiSuccess<AgentAction>> {
    return this.post("/api/plan-action", input, AgentActionResponseSchema.shape.data);
  }

  public async generateAttackVariation(input: z.infer<typeof AttackVariationRequestSchema>): Promise<ApiSuccess<{ readonly requestText: string }>> {
    return this.post("/api/generate-attack-variation", input, AttackVariationResponseSchema.shape.data);
  }

  public async evaluate(input: z.infer<typeof EvaluateRequestSchema>): Promise<ApiSuccess<PolicyDecision>> {
    return this.post("/api/evaluate", input, PolicyDecisionResponseSchema.shape.data);
  }

  public async execute(input: z.infer<typeof ExecuteRequestSchema>): Promise<ApiSuccess<EnforcedActionResult>> {
    return this.post("/api/execute", input, EnforcedActionResponseSchema.shape.data);
  }
}

export const apiClient = new ApiClient();

export type ExecuteInput = {
  readonly action: AgentAction;
  readonly context: EvaluationContext;
  readonly bundle: PolicyBundle;
};
