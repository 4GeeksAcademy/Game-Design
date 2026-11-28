# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game-flows.spec.js >> Wild Cards - 1v1 gameplay >> selects a fighter, enters battle, and resolves an attack animation
- Location: tests/game-flows.spec.js:11:3

# Error details

```
Error: locator.click: Test ended.
Call log:
  - waiting for locator('.solo-finish-turn-button')
    - locator resolved to <button type="button" class="solo-finish-turn-button">…</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action

```

# Test source

```ts
  1   | import {
  2   |   test,
  3   |   expect,
  4   |   bootHome,
  5   |   openSinglePlayer,
  6   |   selectRosterFighter,
  7   |   enterStage,
  8   | } from "./helpers.js";
  9   | 
  10  | test.describe("Wild Cards - 1v1 gameplay", () => {
  11  |   test("selects a fighter, enters battle, and resolves an attack animation", async ({
  12  |     page,
  13  |     browserErrors,
  14  |   }) => {
  15  |     // Allow enough time for the CPU selection and battle transitions.
  16  |     test.setTimeout(180000);
  17  | 
  18  |     await bootHome(page);
  19  |     await openSinglePlayer(page);
  20  | 
  21  |     await page.getByRole("button", {
  22  |       name: /QUICK BATTLE/i,
  23  |     }).click();
  24  | 
  25  |     await page.locator(".choice-button")
  26  |       .filter({ hasText: "1v1" })
  27  |       .click();
  28  | 
  29  |     await page.getByRole("button", {
  30  |       name: /CONTINUE/i,
  31  |     }).click();
  32  | 
  33  |     // Exercise the Hard difficulty route.
  34  |     await page.getByRole("button", {
  35  |       name: /^HARD/i,
  36  |     }).click();
  37  | 
  38  |     await page.getByRole("button", {
  39  |       name: /SELECT YOUR FIGHTER/i,
  40  |     }).click();
  41  | 
  42  |     await selectRosterFighter(page, "Mina");
  43  | 
  44  |     await page.getByRole("button", {
  45  |       name: /CONFIRM FIGHTER/i,
  46  |     }).click();
  47  | 
  48  |     // CPU selection and the character reveal happen automatically.
  49  |     await enterStage(page);
  50  | 
  51  |     await expect(page.locator("#battleLayout")).toBeVisible({
  52  |       timeout: 40000,
  53  |     });
  54  | 
  55  |     // Wait for an actual usable attack, not the Finish Turn button.
  56  |     const attack = page.locator(
  57  |       "#attackList .attack-card:not(.attack-unavailable):not(:disabled)",
  58  |     ).first();
  59  | 
  60  |     await expect(attack).toBeVisible({ timeout: 60000 });
  61  |     await expect(attack).toBeEnabled({ timeout: 60000 });
  62  |     await attack.click();
  63  | 
  64  |     // Verify that the player character actually enters its attack state.
  65  |     await expect(
  66  |       page.locator("#character .solo-fighter-art"),
  67  |     ).toHaveClass(/combat-effect-attack/, { timeout: 4000 });
  68  | 
  69  |     
  70  | // Verify that the player's attack produces a real combat log entry.
  71  | await expect(
  72  |   page.locator("#combatLogEntries .combat-log-entry").first(),
  73  | ).toBeVisible({ timeout: 5000 });
  74  | 
  75  | // Hand the turn to the Hard AI.
> 76  | await page.locator(".solo-finish-turn-button").click();
      |                                                ^ Error: locator.click: Test ended.
  77  | 
  78  | // Wait for the Hard AI to select and display an incoming attack.
  79  | await expect(page.locator("#defensiveActions")).toBeVisible({
  80  |   timeout: 15000,
  81  | });
  82  | 
  83  | // Respond to the AI's attack.
  84  | await expect(page.locator("#evadeButton")).toBeEnabled({
  85  |   timeout: 5000,
  86  | });
  87  | await page.locator("#evadeButton").click();
  88  | 
  89  | // Verify that the defensive response was recorded.
  90  | await expect(
  91  |   page.locator("#combatLogEntries .combat-log-entry").filter({
  92  |     hasText: /EVADED|FAILED TO EVADE/,
  93  |   }),
  94  | ).toBeVisible({ timeout: 7000 });
  95  | 
  96  | expect(browserErrors).toEqual([]);
  97  | 
  98  |   });
  99  | });
  100 | 
  101 | test.describe("Wild Cards - 2v2 gameplay", () => {
  102 |   test("selects two fighters, assigns targets, and resolves a team attack", async ({
  103 |   page,
  104 |   browserErrors,
  105 | }) => {
  106 |   test.setTimeout(180000);
  107 |     await bootHome(page);
  108 |     await openSinglePlayer(page);
  109 | 
  110 |     await page.getByRole("button", {
  111 |       name: /QUICK BATTLE/i,
  112 |     }).click();
  113 | 
  114 |     await page.locator(".choice-button")
  115 |       .filter({ hasText: "2v2" })
  116 |       .click();
  117 | 
  118 |     await page.getByRole("button", {
  119 |       name: /CONTINUE/i,
  120 |     }).click();
  121 | 
  122 |     // First team-control option: one player controls both fighters.
  123 |     await page.locator(".team-control-card").first().click();
  124 | 
  125 |     await page.getByRole("button", {
  126 |       name: /CONTINUE/i,
  127 |     }).click();
  128 | 
  129 |     await page.getByRole("button", {
  130 |       name: /^NORMAL/i,
  131 |     }).click();
  132 | 
  133 |     await page.getByRole("button", {
  134 |       name: /SELECT YOUR FIGHTER/i,
  135 |     }).click();
  136 | 
  137 |     await selectRosterFighter(page, "Mina");
  138 |     await selectRosterFighter(page, "Kirishima");
  139 | 
  140 |     await page.getByRole("button", {
  141 |       name: /CONFIRM TEAM/i,
  142 |     }).click();
  143 | 
  144 |     await enterStage(page);
  145 | 
  146 |     await expect(
  147 |       page.getByRole("heading", { name: /TEAM BATTLE/i }),
  148 |     ).toBeVisible({ timeout: 40000 });
  149 | 
  150 |     // Both player fighters must receive a target.
  151 |     await expect(
  152 |       page.getByRole("heading", { name: /SELECT YOUR TARGETS/i }),
  153 |     ).toBeVisible({ timeout: 20000 });
  154 | 
  155 |    // Wait until the intro overlay becomes non-interactive.
  156 | await expect(page.locator(".round-intro"))
  157 |   .toHaveAttribute("aria-hidden", "true", { timeout: 10000 });
  158 | 
  159 |     const targetGroups = page.locator(".target-choice-group");
  160 | 
  161 |     await expect(targetGroups).toHaveCount(2);
  162 | 
  163 |     await targetGroups.nth(0)
  164 |       .locator(".target-choice-button")
  165 |       .first()
  166 |       .click();
  167 | 
  168 |     await targetGroups.nth(1)
  169 |       .locator(".target-choice-button")
  170 |       .first()
  171 |       .click();
  172 | 
  173 |     await page.getByRole("button", {
  174 |       name: /CONFIRM TARGETS/i,
  175 |     }).click();
  176 | 
```