import { describe, expect, it } from "vitest";

import { ActorContextSchema } from "../../../src/domain/schemas";

describe("domain schemas", () => {
  it("rejects unknown keys", () => {
    expect(() =>
      ActorContextSchema.parse({
        id: "actor.unknown",
        displayName: "Unidentified requester",
        role: "unknown",
        identityVerified: null,
        organizationVerified: null,
        organizationName: null,
        unexpected: true,
      }),
    ).toThrow();
  });
});
