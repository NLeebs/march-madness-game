import { test, expect } from "./support/test";
import { GAME_BUDGET_MS, PHASE_TIMEOUTS } from "./support/timeouts";

test.use({ backendOptions: { persistStatus: 500 } });

test("a failed tournament request shows the crash screen and Start a new game goes home", async ({
  page,
  game,
  backend,
  errors,
}) => {
  test.setTimeout(GAME_BUDGET_MS + 60_000);
  // The browser logs the failed request itself as a console error, without its URL. So the
  // allowance is narrowed by checking below that the only failed response is the tournament.
  const failedResponses: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failedResponses.push(new URL(r.url()).pathname);
  });
  errors.allow(/Failed to load resource.*500/, "failed tournament request shows crash screen");
  // React logs the error the boundary caught (the hook's AppError).
  errors.allow(/Failed to play tournament/, "failed tournament request shows crash screen");

  await game.open();
  await game.start();
  await game.finishSeason();
  await game.goToTournament();
  await game.makePicks(1);
  await game.submitPicks();

  const crashHeading = page.getByRole("heading", { name: "Something went wrong" });
  await expect(crashHeading).toBeVisible({ timeout: PHASE_TIMEOUTS.tournament });
  await expect(page.getByText("Turnover! A crash report is already on the coach's desk.")).toBeVisible();
  expect(backend.persistRequests, "the tournament was requested once").toHaveLength(1);
  // The response event can land after the crash screen shows, so poll for it.
  await expect
    .poll(() => failedResponses, { message: "the only failed response is the tournament request" })
    .toEqual(["/api/bracket/simulation"]);

  const restart = page.getByRole("button", { name: "Start a new game" });
  await expect(restart).toBeVisible();
  await restart.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(crashHeading).toHaveCount(0);
  await game.open();
});
