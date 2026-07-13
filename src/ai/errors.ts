import "server-only";

export const PROVIDER_ERROR_CODES = [
  "PROVIDER_CONFIGURATION",
  "PROVIDER_TIMEOUT",
  "PROVIDER_NETWORK",
  "PROVIDER_RATE_LIMIT",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_EMPTY_RESPONSE",
  "PROVIDER_INVALID_OUTPUT",
] as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];

export class ProviderError extends Error {
  public override readonly name = "ProviderError";

  public constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly underlying?: unknown,
  ) {
    super(message);
  }
}
