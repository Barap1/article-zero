import "server-only"

import { createHash } from "node:crypto"

export function clientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const address = forwarded || request.headers.get("x-real-ip") || "anonymous"
  return createHash("sha256").update(address).digest("hex")
}
