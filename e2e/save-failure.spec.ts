import { test, expect } from "./support/test";
import { PHASE_TIMEOUTS, PICK_ACTION_TIMEOUT_MS } from "./support/timeouts";

test.use({ backendOptions: { persistStatus: 500 } });

test("a failed bracket save is silent: the recap still shows and Play Again works", async ({
  page,
  game,
  backend,
  errors,
}) => {
  test.setTimeout(
    Object.values(PHASE_TIMEOUTS).reduce((sum, ms) => sum + ms, 0) + 70 * PICK_ACTION_TIMEOUT_MS + 60_000,
  );
  // The browser logs the failed request itself as a console error.
  errors.allow(/Failed to load resource.*500/, "silent save failure, finding 43");

  await game.open();
  await game.start();
  await game.finishSeason();
  await game.goToTournament();
  await game.makePicks(1);
  await game.playTournament();

  const recap = await game.openRecap();
  await expect(recap.getByText("We Have a New Champ")).toBeVisible();
  await expect.poll(() => backend.persistRequests.length, { message: "save was attempted" }).toBe(1);
  // Today the player is told nothing: no error toast (the auto `errors` fixture checks this too).
  await expect(page.locator('[data-sonner-toaster] [data-type="error"]')).toHaveCount(0);

  await game.restart();
  await expect(page.getByRole("button", { name: "Start the game" })).toBeEnabled();
});
