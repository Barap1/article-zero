import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { AuditDrawer } from "../../../../src/components/article-zero/audit-drawer";
import { createSeedWorkspace } from "../../../../src/workspace/create-seed-workspace";

afterEach(cleanup);

it("filters typed audit events and delegates export", async () => {
  const workspace = createSeedWorkspace();
  const onExport = vi.fn();
  render(<AuditDrawer events={[
    { id: "audit.activation", timestamp: "2026-07-13T12:00:00.000Z", type: "CONSTITUTION_ACTIVATED", actorLabel: "user", constitutionVersionId: "version.active", relatedIds: ["version.active"], detail: "Activated policy.", source: "user", integrityHash: "integrity.activation" },
    { id: "audit.blocked", timestamp: "2026-07-13T12:01:00.000Z", type: "TOOL_BLOCKED", actorLabel: "actor.fake", constitutionVersionId: "version.active", relatedIds: ["action.fake"], detail: "Blocked disclosure.", source: "deterministic", integrityHash: "integrity.blocked" },
  ]} onClose={() => undefined} onExport={onExport} />);

  await userEvent.setup().selectOptions(screen.getByLabelText(/filter audit events/i), "TOOL_BLOCKED");

  expect(screen.getByText("Blocked disclosure.")).toBeTruthy();
  expect(screen.queryByText("Activated policy.")).toBeNull();
  await userEvent.setup().click(screen.getByRole("button", { name: /export audit package/i }));
  expect(onExport).toHaveBeenCalledTimes(1);
  expect(workspace.auditEvents).toHaveLength(0);
});
