import { expect, test } from "@playwright/test";

test("hero repair loop uses deterministic fallback from breach to audit export", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open the Constitution" }).click();
  await page.getByRole("tab", { name: /attack/i }).click();
  await page.getByRole("button", { name: /run protected action/i }).click();

  await expect(page.getByRole("alert", { name: "Policy breach" })).toContainText("Policy breach");
  await expect(page.getByText("Home address").first()).toBeVisible();
  await expect(page.getByText(/Identity was not verified/i)).toBeVisible();

  await page.getByRole("button", { name: /amend the constitution/i }).click();
  await expect(page.locator("#clause-editor")).toHaveValue(/credible and imminent threat to life/i);
  await page.getByRole("button", { name: /compile clause/i }).click();
  await page.getByRole("button", { name: /accept compiled policy/i }).click();

  await page.getByRole("tab", { name: /testing/i }).click();
  await page.getByRole("button", { name: /run regression suite/i }).click();
  await expect(page.getByText("Pass").first()).toBeVisible();
  await page.getByRole("button", { name: /activate constitution/i }).click();

  await expect(page.getByRole("heading", { name: /prove the repair/i })).toBeVisible();
  await page.getByRole("button", { name: /replay exact frozen attack/i }).click();
  await expect(page.getByText("Fake responder: DENY")).toBeVisible();
  await page.getByRole("button", { name: /run verified responder control/i }).click();
  await expect(page.getByText("Verified responder: ALLOW_WITH_FIELD_FILTER")).toBeVisible();
  await page.getByRole("button", { name: /request privacy-officer approval/i }).click();
  await page.getByRole("button", { name: /approve frozen action/i }).click();
  await expect(page.getByText(/ALLOW_WITH_FIELD_FILTER after privacy-officer approval/i)).toBeVisible();

  await page.getByRole("button", { name: /audit timeline/i }).click();
  await expect(page.getByRole("heading", { name: /audit timeline/i })).toBeVisible();
  await expect(page.locator(".az-audit-list").getByText("CONSTITUTION_ACTIVATED")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /export audit package/i }).click();
  await (await download).cancel();
});
