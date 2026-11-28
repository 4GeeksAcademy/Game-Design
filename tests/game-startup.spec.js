import { test, expect } from "@playwright/test";

test("Wild Cards starts and displays the home screen", async ({ page }) => {
  const browserErrors = [];

  page.on("pageerror", (error) => {
    browserErrors.push(error.message);
  });

  await page.goto("/Game-Design/");

  // The introduction should appear first.
  const skipButton = page.getByRole("button", {
    name: /PRESS ANY KEY TO SKIP/i,
  });

  await expect(skipButton).toBeVisible({ timeout: 30000 });

  // Skip the introduction.
  await skipButton.click();

  // Verify that the home screen renders.
  await expect(page.locator(".home-content")).toBeVisible({
    timeout: 30000,
  });

  expect(browserErrors).toEqual([]);
});
