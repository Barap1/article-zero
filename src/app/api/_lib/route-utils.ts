import "server-only"

import { z } from "zod"

import type { ApiErrorCode, ApiSource } from "../../../domain/api"
import { ProviderError } from "../../../ai/errors"
import type { AiProvider, AiResult } from "../../../ai/types"
import { clientIdentifier } from "../../../lib/client-identifier"

const BODY_LIMIT = 256 * 1024
const WINDOW_MS = 60_000
const MAX_AI_CALLS = 20
const calls = new Map<string, { count: number; resetAt: number }>()

export class RouteError extends Error {
  public override readonly name = "RouteError"

  public constructor(public readonly code: ApiErrorCode, message: string, public readonly retryable = false, public readonly status = 400) {
    super(message)
  }
}

export function requestId(): string {
  return crypto.randomUUID()
}

function headers(requestIdValue: string): Headers {
  return new Headers({ "Cache-Control": "no-store", "Content-Type": "application/json", "X-Request-Id": requestIdValue })
}

export function success<T>(requestIdValue: string, startedAt: number, source: ApiSource, data: T): Response {
  return new Response(JSON.stringify({ ok: true, data, meta: { requestId: requestIdValue, durationMs: Date.now() - startedAt, source } }), { status: 200, headers: headers(requestIdValue) })
}

export function failure(requestIdValue: string, error: unknown): Response {
  const normalized = error instanceof RouteError ? error : normalizeProviderError(error)
  return new Response(JSON.stringify({ ok: false, error: { code: normalized.code, message: normalized.message, retryable: normalized.retryable, requestId: requestIdValue } }), { status: normalized.status, headers: headers(requestIdValue) })
}

function normalizeProviderError(error: unknown): RouteError {
  if (error instanceof ProviderError) {
    const providerCode = error.code
    if (providerCode === "PROVIDER_RATE_LIMIT") return new RouteError("PROVIDER_RATE_LIMITED", error.message, true, 429)
    if (providerCode === "PROVIDER_INVALID_OUTPUT" || providerCode === "PROVIDER_EMPTY_RESPONSE") return new RouteError("PROVIDER_INVALID_OUTPUT", error.message, false, 502)
    if (providerCode === "PROVIDER_CONFIGURATION" || providerCode === "PROVIDER_TIMEOUT" || providerCode === "PROVIDER_NETWORK" || providerCode === "PROVIDER_UNAVAILABLE") return new RouteError("PROVIDER_UNAVAILABLE", error.message, error.retryable, 503)
  }
  return new RouteError("INTERNAL_ERROR", "The request could not be completed.", false, 500)
}

export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const contentLength = request.headers.get("content-length")
  if (contentLength !== null && Number(contentLength) > BODY_LIMIT) throw new RouteError("INVALID_REQUEST", "Request body is too large.", false, 413)
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > BODY_LIMIT) throw new RouteError("INVALID_REQUEST", "Request body is too large.", false, 413)
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new RouteError("INVALID_REQUEST", "Request body must be valid JSON.")
  }
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new RouteError("INVALID_REQUEST", "Request body does not match the API contract.")
  return parsed.data
}

export function enforceSameOrigin(request: Request): void {
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (origin !== null && host !== null && new URL(origin).host !== host) throw new RouteError("INVALID_REQUEST", "Cross-origin requests are not allowed.", false, 403)
}

export function enforceAiLimit(request: Request): void {
  const key = clientIdentifier(request)
  const now = Date.now()
  const current = calls.get(key)
  if (current === undefined || current.resetAt <= now) {
    calls.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  if (current.count >= MAX_AI_CALLS) throw new RouteError("PROVIDER_RATE_LIMITED", "Demo AI call limit reached. Try again shortly.", true, 429)
  current.count += 1
}

export function providerSource<T>(result: AiResult<T>): ApiSource {
  return result.meta.source
}

export type ProviderFactory = () => AiProvider
