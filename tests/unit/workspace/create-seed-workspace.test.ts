import { expect, it } from "vitest";

import { WorkspaceStateSchema } from "../../../src/domain/schemas";
import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";

it("creates a stable, independently mutable seed workspace", () => {
  const first = createSeedWorkspace(new Date("2026-07-13T12:00:00.000Z"));
  const second = createSeedWorkspace(new Date("2026-07-13T12:00:00.000Z"));
  expect(first).toEqual(second);
  const firstVersion = first.versions[0];
  const secondVersion = second.versions[0];
  if (!firstVersion || !secondVersion) throw new Error("seed versions missing");
  firstVersion.label = "mutated";
  expect(secondVersion.label).not.toBe("mutated");
  expect(WorkspaceStateSchema.parse(second)).toEqual(second);
});
