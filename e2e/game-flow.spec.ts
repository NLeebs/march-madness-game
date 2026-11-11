import { test, expect } from "./support/test";
import { readState } from "./support/state";
import { PHASE_TIMEOUTS, PICK_ACTION_TIMEOUT_MS } from "./support/timeouts";
import type { GamePage } from "./support/game";

/** Every phase of one game at its limit, plus the pick-making budget. */
const GAME_BUDGET_MS =
  Object.values(PHASE_TIMEOUTS).reduce((sum, ms) => sum + ms, 0) +
  70 * PICK_ACTION_TIMEOUT_MS;

/** Collects every `team` string in the (nested) picks tree. */
function pickedTeams(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((child) => pickedTeams(child, found));
  } else if (node && typeof node === "object") {
    Object.entries(node).forEach(([key, value]) => {
      if (key === "team" && typeof value === "string" && value !== "") found.push(value);
      else pickedTeams(value, found);
    });
  }
  return found;
}

/** Plays through to the recap and logs how long each phase took. */
async function playToRecap(game: GamePage, label: string): Promise<void> {
  const times: string[] = [];
  const timed = async (phase: string, fn: () => Promise<unknown>) => {
    const started = Date.now();
    await fn();
    times.push(`${phase}=${Date.now() - started}ms`);
  };
  await timed("toSeason", () => game.start());
  await timed("season", () => game.finishSeason());
  await timed("toSelection", () => game.goToTournament());
  await timed("picks", () => game.makePicks(1));
  await timed("tournament", () => game.playTournament());
  console.log(`[phase timings] ${label}: ${times.join(" ")}`);
}

test("plays a full game and restarts into a clean second game @every-size", async ({
  page,
  game,
}) => {
  test.setTimeout(2 * GAME_BUDGET_MS + 60_000);

  await game.open();
  await playToRecap(game, "game 1");
  const recap = await game.openRecap();
  await expect(recap).toBeVisible();
  const started = Date.now();
  await game.restart();
  console.log(`[phase timings] restart: toStart=${Date.now() - started}ms`);

  const state = await readState(page);
  expect(pickedTeams(state.tournamentPlayersPicks.picks), "picks after restart").toEqual([]);
  expect(state.tournament.playerScore).toBe(0);
  for (const [region, seeds] of Object.entries(state.tournament.tournamentSeeds)) {
    expect(seeds, `seeds for ${region} after restart`).toEqual([]);
  }
  // The start screen re-registers every team with a blank record once the stats reload, so
  // "clean" means every record is 0-0 with no selection score (not that the map is empty).
  const records = Object.values(state.regularSeasonRecords.records);
  expect(records.filter((r) => r.wins !== 0 || r.losses !== 0 || r.tournamentSelectionScore !== 0)).toEqual([]);
  expect(state.regularSeasonRecords.weeksPlayed).toBe(0);

  await playToRecap(game, "game 2");
  await game.openRecap();
});

test("reload mid-tournament returns to a clean start", async ({ page, game }) => {
  test.setTimeout(GAME_BUDGET_MS + 60_000);

  await game.open();
  await game.start();
  await game.finishSeason();
  await game.goToTournament();
  await game.makePicks(1);
  await game.submitPicks();
  await page.reload();

  const startButton = page.getByRole("button", { name: "Start the game" });
  await expect(startButton, "phase: start screen after reload").toBeVisible({
    timeout: PHASE_TIMEOUTS.toStart,
  });
  await expect(page.getByTestId("regular-season")).toHaveCount(0);
  await game.start();
});
