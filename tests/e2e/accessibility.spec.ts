import { expect, test } from "@playwright/test";

test("command center preserves keyboard landmarks and reduced-motion behavior", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /policy that can say no/i })).toBeVisible();
  await page.goto("/workspace");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to command surface" })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Workflow stages" })).toBeVisible();
  await expect(page.getByText("Sample workspace. Synthetic data only. Not for clinical use.")).toBeVisible();

  await page.getByRole("button", { name: "Open the policy workspace" }).click();
  await expect(page.locator("#policy-graph-description")).toHaveClass(/az-visually-hidden/);
  await expect(page.getByText("Graph text alternative")).toHaveCount(0);
  await expect(page.locator(".az-stage-transition")).toHaveCSS("animation-duration", "0s");
});
