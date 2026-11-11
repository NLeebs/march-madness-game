import { test, expect } from "./support/test";
import { PHASE_TIMEOUTS, PICK_ACTION_TIMEOUT_MS } from "./support/timeouts";
import { BRACKET_ROUNDS } from "./support/bracketMap";
import { layoutSignature } from "./support/layout";
import { checkHighlights, checkScore } from "./checks/results";

test("wide screen shows every round at once and plays without banner navigation @wide", async ({
  page,
  game,
}) => {
  test.setTimeout(
    Object.values(PHASE_TIMEOUTS).reduce((sum, ms) => sum + ms, 0) + 70 * PICK_ACTION_TIMEOUT_MS + 60_000,
  );
  // 2560 is above TOURNAMENT_BREAK_POINT (2350): no round banner, all columns showing.
  expect(page.viewportSize()?.width, "wide project width").toBeGreaterThan(2350);

  await game.open();
  await game.start();
  await game.finishSeason();
  await game.goToTournament();

  await expect(page.getByTestId("round-select-banner"), "round banner is hidden on a wide screen").toHaveCount(0);
  const expected = ["bracket-column-playin", ...BRACKET_ROUNDS.map((r) => r.testId), "bracket-column-champion"].sort();
  // Polled: columns animate in after the tournament screen mounts.
  await expect
    .poll(() => layoutSignature(page), {
      message: "no banner, every round column visible at once",
      timeout: PICK_ACTION_TIMEOUT_MS,
    })
    .toEqual({ bannerVisible: false, visibleColumns: expected });
  await game.checkNoOverlap("bracket picks");

  await game.makePicks(1);
  await game.playTournament();
  await game.checkNoOverlap("tournament finished");
  await checkScore(page, await checkHighlights(page));
});
