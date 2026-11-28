import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  browserErrors: async ({ page }, use) => {
    const errors = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await use(errors);

    expect(errors, "Unexpected browser JavaScript errors").toEqual([]);
  },
});

export { expect };

export const TEST_FIGHTERS = [
  "mina",
  "kirishima",
  "usopp",
  "ochaco",
  "rockLee",
  "chad",
  "picolo",
  "tenten",
  "luffy",
  "ichigo",
  "naruto",
  "yoruichi",
];

export async function bootHome(page) {
  // Each test gets its own isolated browser context and test-only game data.
  await page.addInitScript((fighters) => {
    localStorage.clear();

    localStorage.setItem(
      "fightersArenaUnlockedCharacters",
      JSON.stringify(fighters),
    );

    localStorage.setItem("fightersArenaCoins", "100000");
  }, TEST_FIGHTERS);

  await page.goto("/Game-Design/");

  await page.getByRole("button", {
    name: /PRESS ANY KEY TO SKIP/i,
  }).click();

  await expect(page.locator(".home-content")).toBeVisible({
    timeout: 30000,
  });
}

export async function openSinglePlayer(page) {
  const introSkip = page.getByRole("button", {
    name: /PRESS ANY KEY TO SKIP/i
  });

  // Wait for the intro, then simulate the player pressing a key to skip it.
  await introSkip.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});

  if (await introSkip.isVisible().catch(() => false)) {
    await page.keyboard.press("Space");
  }

  // Do not attempt to click Play until the actual home menu is visible.
  await page.locator(".home-content").waitFor({
    state: "visible",
    timeout: 30000
  });

  await page
    .getByRole("navigation", { name: "Main menu" })
    .getByRole("button", { name: /PLAY.*ENTER THE ARENA/i })
    .click();

  await page.getByRole("button", {
    name: /SINGLE PLAYER/i,
  }).click();
}

export async function selectRosterFighter(page, name) {
  const fighter = page
    .locator(".roster-tile")
    .filter({ hasText: new RegExp(name, "i") })
    .first();

  await expect(fighter).toBeVisible();
  await expect(fighter).toBeEnabled();
  await fighter.click();
}

export async function enterStage(page) {
  await expect(
    page.getByRole("heading", { name: /SELECT YOUR STAGE/i }),
  ).toBeVisible({ timeout: 40000 });

  await page.getByRole("button", {
    name: /ENTER THE ARENA/i,
  }).click();
}
