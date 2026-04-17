import { expect, test } from "@playwright/test";

test.describe("Home", () => {
  test("has application title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/InterlinedList/);
  });
});
