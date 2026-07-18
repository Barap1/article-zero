import { expect, test } from "@playwright/test";

test("sample repair workflow runs from breach to audit export", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open the policy workspace" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await page.getByRole("tab", { name: /attack/i }).click();
  await page.getByRole("button", { name: /run request/i }).click();
  await page.getByRole("button", { name: /view incident/i }).click();

  await expect(page.getByRole("alert", { name: "Policy breach" })).toContainText("Policy breach", {
    timeout: 15_000,
  });
  await expect(page.getByText("Home address").first()).toBeVisible();
  await expect(page.getByText(/Identity was not verified/i)).toBeVisible();

  await page.getByRole("button", { name: /create amendment/i }).click();
  await expect(page.locator("#amendment-text")).toHaveValue(/requests from emergency responders may override normal privacy restrictions/i);
  await page.getByRole("button", { name: /use suggested repair/i }).click();
  await page.getByRole("button", { name: /compile preview/i }).click();
  await page.getByRole("button", { name: /accept compiled policy/i }).click();
  await page.getByRole("button", { name: /continue to testing/i }).click();

  await page.getByRole("button", { name: /run regression suite/i }).click();
  await expect(page.getByText("Pass").first()).toBeVisible();
  await page.getByRole("button", { name: /activate constitution/i }).click();

  await expect(page.getByRole("heading", { name: /prove the repair/i })).toBeVisible();
  await page.getByRole("button", { name: /replay exact frozen attack/i }).click();
  await expect(page.getByText(/Fake request: Blocked/)).toBeVisible();
  await page.getByRole("button", { name: /run verified responder control/i }).click();
  await expect(page.getByText(/Verified responder: Allowed with field filter/)).toBeVisible();
  await page.getByText("Optional advanced approval branch").click();
  await page.getByRole("button", { name: /request approval/i }).click();
  await page.getByRole("button", { name: /approve frozen action/i }).click();
  await expect(page.getByText(/Allowed with field filter after privacy-officer approval/i)).toBeVisible();

  await page.getByRole("button", { name: /audit timeline/i }).click();
  await expect(page.getByRole("heading", { name: /audit timeline/i })).toBeVisible();
  await expect(page.locator(".az-audit-list").getByText("Constitution activated")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /export audit package/i }).click();
  await (await download).cancel();
});
