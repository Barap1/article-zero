import type { PolicyBundle } from "../domain/schemas";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return [...value].map(canonicalize).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, canonicalize(entry)]));
  return value;
}

export async function hashPolicyBundle(bundle: PolicyBundle): Promise<string> {
  const semanticBundle = { schemaVersion: bundle.schemaVersion, rules: bundle.rules, defaults: bundle.defaults };
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonicalize(semanticBundle))));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
