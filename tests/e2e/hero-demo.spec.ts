import { expect, test } from "@playwright/test";

test("breach: the fake responder exposes excessive patient data under the legacy policy", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open the Constitution" }).click();
  await page.getByRole("tab", { name: /attack/i }).click();
  await page.getByRole("button", { name: /run protected action/i }).click();

  await expect(page.getByRole("alert", { name: "Policy breach" })).toContainText("Policy breach");
  await expect(page.getByText("Home address").first()).toBeVisible();
  await expect(page.getByText(/Identity was not verified/i)).toBeVisible();
});
