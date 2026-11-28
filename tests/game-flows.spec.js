import {
  test,
  expect,
  bootHome,
  openSinglePlayer,
  selectRosterFighter,
  enterStage,
} from "./helpers.js";

test.describe("Wild Cards - 1v1 gameplay", () => {
  test("selects a fighter, enters battle, and resolves an attack animation", async ({
    page,
    browserErrors,
  }) => {
    // Allow enough time for the CPU selection and battle transitions.
    test.setTimeout(180000);

    await bootHome(page);
    await openSinglePlayer(page);

    await page.getByRole("button", {
      name: /QUICK BATTLE/i,
    }).click();

    await page.locator(".choice-button")
      .filter({ hasText: "1v1" })
      .click();

    await page.getByRole("button", {
      name: /CONTINUE/i,
    }).click();

    // Exercise the Hard difficulty route.
    await page.getByRole("button", {
      name: /^HARD/i,
    }).click();

    await page.getByRole("button", {
      name: /SELECT YOUR FIGHTER/i,
    }).click();

    await selectRosterFighter(page, "Mina");

    await page.getByRole("button", {
      name: /CONFIRM FIGHTER/i,
    }).click();

    // CPU selection and the character reveal happen automatically.
    await enterStage(page);

    await expect(page.locator("#battleLayout")).toBeVisible({
      timeout: 40000,
    });

    // Wait for an actual usable attack, not the Finish Turn button.
    const attack = page.locator(
      "#attackList .attack-card:not(.attack-unavailable):not(:disabled)",
    ).first();

    await expect(attack).toBeVisible({ timeout: 60000 });
    await expect(attack).toBeEnabled({ timeout: 60000 });
    await attack.click();

    // Verify that the player character actually enters its attack state.
    await expect(
      page.locator("#character .solo-fighter-art"),
    ).toHaveClass(/combat-effect-attack/, { timeout: 4000 });

    
// Verify that the player's attack produces a real combat log entry.
await expect(
  page.locator("#combatLogEntries .combat-log-entry").first(),
).toBeVisible({ timeout: 5000 });

// Hand the turn to the Hard AI.
await page.locator(".solo-finish-turn-button").click();

// Wait for the Hard AI to select and display an incoming attack.
await expect(page.locator("#defensiveActions")).toBeVisible({
  timeout: 15000,
});

// Respond to the AI's attack.
await expect(page.locator("#evadeButton")).toBeEnabled({
  timeout: 5000,
});
await page.locator("#evadeButton").click();

// Verify that the defensive response was recorded.
await expect(
  page.locator("#combatLogEntries .combat-log-entry").filter({
    hasText: /EVADED|FAILED TO EVADE/,
  }),
).toBeVisible({ timeout: 7000 });

expect(browserErrors).toEqual([]);

  });
});

test.describe("Wild Cards - 2v2 gameplay", () => {
  test("selects two fighters, assigns targets, and resolves a team attack", async ({
  page,
  browserErrors,
}) => {
  test.setTimeout(180000);
    await bootHome(page);
    await openSinglePlayer(page);

    await page.getByRole("button", {
      name: /QUICK BATTLE/i,
    }).click();

    await page.locator(".choice-button")
      .filter({ hasText: "2v2" })
      .click();

    await page.getByRole("button", {
      name: /CONTINUE/i,
    }).click();

    // First team-control option: one player controls both fighters.
    await page.locator(".team-control-card").first().click();

    await page.getByRole("button", {
      name: /CONTINUE/i,
    }).click();

    await page.getByRole("button", {
      name: /^NORMAL/i,
    }).click();

    await page.getByRole("button", {
      name: /SELECT YOUR FIGHTER/i,
    }).click();

    await selectRosterFighter(page, "Mina");
    await selectRosterFighter(page, "Kirishima");

    await page.getByRole("button", {
      name: /CONFIRM TEAM/i,
    }).click();

    await enterStage(page);

    await expect(
      page.getByRole("heading", { name: /TEAM BATTLE/i }),
    ).toBeVisible({ timeout: 40000 });

    // Both player fighters must receive a target.
    await expect(
      page.getByRole("heading", { name: /SELECT YOUR TARGETS/i }),
    ).toBeVisible({ timeout: 20000 });

   // Wait until the intro overlay becomes non-interactive.
await expect(page.locator(".round-intro"))
  .toHaveAttribute("aria-hidden", "true", { timeout: 10000 });

    const targetGroups = page.locator(".target-choice-group");

    await expect(targetGroups).toHaveCount(2);

    await targetGroups.nth(0)
      .locator(".target-choice-button")
      .first()
      .click();

    await targetGroups.nth(1)
      .locator(".target-choice-button")
      .first()
      .click();

    await page.getByRole("button", {
      name: /CONFIRM TARGETS/i,
    }).click();

    // Verify that a player attack becomes available.
    const teamAttack = page.locator(
      ".player-attack-panel.is-active .team-attack-card:not(:disabled)",
    ).first();

    await expect(teamAttack).toBeEnabled({ timeout: 20000 });
    await teamAttack.click();

    // Verify actual combat resolution.
    await expect(
      page.locator(".combat-log-messages .combat-log-entry").first(),
    ).toBeVisible({ timeout: 10000 });

    expect(browserErrors).toEqual([]);
  });
});

async function openTournament(page, size) {
  await bootHome(page);
  await openSinglePlayer(page);

  await page.getByRole("button", {
    name: /TOURNAMENT/i,
  }).click();

  await expect(
    page.getByRole("heading", { name: /ENTER THE TOURNAMENT/i }),
  ).toBeVisible();

  await page.getByRole("button", {
    name: /GENERATE BRACKET/i,
  }).click();

  await expect(
    page.getByRole("heading", { name: /CHOOSE YOUR BRACKET/i }),
  ).toBeVisible();

  await page.locator(".wc-tourney-format-option")
    .nth(size === 4 ? 0 : 1)
    .click();

  await page.locator(".wc-tourney-format-confirm").click();

  await expect(
    page.locator(".wc-tourney-start-dialog"),
  ).toBeVisible({ timeout: 20000 });

  // Reveal all random CPU contenders.
  await page.getByRole("button", {
    name: /DRAW CONTENDERS/i,
  }).click();

  await expect(
    page.getByRole("heading", { name: /THE FIELD IS SET/i }),
  ).toBeVisible({ timeout: 15000 });

  await expect(
    page.locator(".wc-tourney-first-opponent"),
  ).toBeVisible();

  // Begin the tournament.
  await page.getByRole("button", {
    name: /START TOURNAMENT/i,
  }).click();

  const expectedRound = size === 4 ? /SEMIFINALS/i : /QUARTERFINALS/i;

  await expect(
    page.locator(".wc-tourney-round-title h2"),
  ).toHaveText(expectedRound, { timeout: 15000 });
}

test.describe("Wild Cards - Tournament mode", () => {
  for (const size of [4, 8]) {
    test(`generates and starts a ${size}-fighter tournament`, async ({
      page,
      browserErrors,
    }) => {
      await openTournament(page, size);

      await expect(
        page.locator(".wc-tourney-round"),
      ).toBeVisible();

      expect(browserErrors).toEqual([]);
    });
  }
});
