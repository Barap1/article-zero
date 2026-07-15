import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";

import { ArticleZeroCommandCenter } from "../../../src/components/article-zero/article-zero-command-center";
import { createSeedWorkspace } from "../../../src/workspace/create-seed-workspace";
import { useWorkspaceStore } from "../../../src/workspace/workspace-store";

afterEach(cleanup);

it("opens the constitution from the fresh briefing", () => {
  useWorkspaceStore.setState({ workspace: createSeedWorkspace(), hasHydrated: true, isHydrating: false, showBriefing: true, errorMessage: null });

  render(createElement(ArticleZeroCommandCenter));
  fireEvent.click(screen.getByRole("button", { name: "Open the policy workspace" }));

  expect(useWorkspaceStore.getState().workspace.demoStage).toBe("CONSTITUTION");
  expect(screen.getByRole("heading", { name: "Constitution workspace" })).toBeTruthy();
});

it("lets keyboard users move between demo stages", () => {
  useWorkspaceStore.setState({ workspace: createSeedWorkspace(), hasHydrated: true, isHydrating: false, showBriefing: false, errorMessage: null });

  render(createElement(ArticleZeroCommandCenter));
  const attackStage = screen.getAllByRole("tab", { name: /Attack/ }).find((element) => element.id === "stage-attack");
  if (attackStage === undefined) throw new Error("Attack stage tab missing.");
  fireEvent.keyDown(attackStage, { key: "Enter" });

  expect(useWorkspaceStore.getState().workspace.demoStage).toBe("ATTACK");
});
