import { expect, test } from "@playwright/test";

test("command center preserves keyboard landmarks and reduced-motion behavior", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to command surface" })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Demo stages" })).toBeVisible();
  await expect(page.getByText("Hackathon prototype. Synthetic data. Not for clinical use.")).toBeVisible();

  await page.getByRole("button", { name: "Open the Constitution" }).click();
  await expect(page.getByRole("region", { name: "Policy graph text alternative" })).toBeVisible();
  await expect(page.locator(".az-stage-transition")).toHaveCSS("animation-duration", "0s");
});
