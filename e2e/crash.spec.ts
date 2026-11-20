import { test, expect } from "./support/test";
import { e2eOneTeamConferenceStats } from "./fixtures/league";
import { GAME_BUDGET_MS, PHASE_TIMEOUTS } from "./support/timeouts";

// conf01 has one team, so the server's season (Selection Sunday validation) fails with a GameDataError.
test.use({ backendOptions: { teamStats: e2eOneTeamConferenceStats } });

test("a crash at Selection Sunday shows the crash screen and Start a new game goes home", async ({
  page,
  game,
  errors,
}) => {
  test.setTimeout(GAME_BUDGET_MS);
  // React logs the error the boundary caught. Nothing else may be logged.
  // The browser logs the failed request without its URL, so the allowance is narrowed by
  // checking below that the only failed response is the season.
  const failedResponses: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failedResponses.push(new URL(r.url()).pathname);
  });
  errors.allow(/Failed to load resource.*500/, "forced crash to test the error boundary (step 8b)");
  errors.allow(/Conference "conf01" has 1 team/, "forced crash to test the error boundary (step 8b)");

  await game.open();
  // Not game.start(): the season request fails, so the regular season is never visible.
  await page.getByRole("button", { name: "Start the game" }).click();

  const crashHeading = page.getByRole("heading", { name: "Something went wrong" });
  await expect(crashHeading).toBeVisible({
    timeout: PHASE_TIMEOUTS.toSeason + PHASE_TIMEOUTS.season,
  });
  await expect
    .poll(() => failedResponses, { message: "the only failed response is the season request" })
    .toEqual(["/api/season"]);
  const restart = page.getByRole("button", { name: "Start a new game" });
  await expect(restart).toBeVisible();

  await restart.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(crashHeading).toHaveCount(0);
  await game.open();
});
