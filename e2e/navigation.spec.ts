import type { Locator, Page } from "@playwright/test";
import { test, expect } from "./support/test";
import { PHASE_TIMEOUTS, PICK_ACTION_TIMEOUT_MS } from "./support/timeouts";
import { BRACKET_ROUNDS } from "./support/bracketMap";
import { XXXL_LARGE_BREAK_POINT } from "@/src/constants";

const banner = (page: Page) => page.getByTestId("round-select-banner");
const backButton = (page: Page) => banner(page).getByRole("button", { name: "Previous round" });

/** Exactly one banner button is marked as selected, and it is `name`. */
async function expectSelected(page: Page, name: string): Promise<void> {
  const selected = banner(page).locator('button[aria-current="true"]');
  await expect(selected, `selected round button (wanted ${name})`).toHaveCount(1, {
    timeout: PICK_ACTION_TIMEOUT_MS,
  });
  await expect(
    banner(page).getByRole("button", { name, exact: true }),
    `"${name}" should be the selected round button`,
  ).toHaveAttribute("aria-current", "true", { timeout: PICK_ACTION_TIMEOUT_MS });
}

/** Both copies (top and bottom half) of a column are showing; finals has only one copy. */
async function expectColumnVisible(page: Page, testId: string): Promise<void> {
  const columns: Locator = page.getByTestId(testId);
  const count = await columns.count();
  expect(count, `${testId} copies in the page`).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(columns.nth(i), `${testId} copy ${i} should be showing`).toBeVisible({
      timeout: PICK_ACTION_TIMEOUT_MS,
    });
  }
}

test("round banner buttons and back button switch the visible round @every-size", async ({
  page,
  game,
}) => {
  test.setTimeout(PHASE_TIMEOUTS.toSeason + PHASE_TIMEOUTS.season + PHASE_TIMEOUTS.toSelection + 120_000);
  await game.open();
  await game.start();
  await game.finishSeason();
  await game.goToTournament();
  test.skip(!(await banner(page).isVisible()), "round banner only shows below the tournament break point");

  const hasBack = (page.viewportSize()?.width ?? 0) <= XXXL_LARGE_BREAK_POINT;

  await expectSelected(page, "Round of 64");
  await expectColumnVisible(page, "bracket-column-1");
  await expect(backButton(page), "no back button on the first round").toHaveCount(0);

  // Forward: later buttons are never collapsed, so a player can click each in turn.
  for (const round of BRACKET_ROUNDS) {
    await banner(page)
      .getByRole("button", { name: round.banner, exact: true })
      .click({ timeout: PICK_ACTION_TIMEOUT_MS });
    await expectSelected(page, round.banner);
    await expectColumnVisible(page, round.testId);
  }

  // Back: one round at a time down to Round of 64.
  if (hasBack) {
    for (let i = BRACKET_ROUNDS.length - 1; i > 0; i--) {
      await backButton(page).click({ timeout: PICK_ACTION_TIMEOUT_MS });
      const previous = BRACKET_ROUNDS[i - 1];
      await expectSelected(page, previous.banner);
      await expectColumnVisible(page, previous.testId);
    }
    await expect(backButton(page), "back button hides again on the first round").toHaveCount(0);
  } else {
    await expect(backButton(page), "no back button at this width").toHaveCount(0);
  }
});
