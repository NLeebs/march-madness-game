import type { Page } from "@playwright/test";
import { test, expect } from "./support/test";
import { readState } from "./support/state";
import { PHASE_TIMEOUTS, PICK_ACTION_TIMEOUT_MS } from "./support/timeouts";
import { checkGameCounts, checkConferenceChampions } from "./checks/season";
import { checkCascadeClears } from "./checks/picks";
import { checkHighlights, checkScore, checkRecap, checkPersistPayload } from "./checks/results";
import type { GamePage, RecordedPick } from "./support/game";

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
async function playToRecap(game: GamePage, page: Page, label: string): Promise<RecordedPick[]> {
  const times: string[] = [];
  const timed = async (phase: string, fn: () => Promise<unknown>) => {
    const started = Date.now();
    await fn();
    times.push(`${phase}=${Date.now() - started}ms`);
  };
  await timed("toSeason", () => game.start());
  await timed("season", () => game.finishSeason());
  // "Go to Tournament" only appears once Selection Sunday starts, so after finishSeason the
  // screen is already in its Selection Sunday view: records and trophy icons both show.
  await checkGameCounts(page);
  await checkConferenceChampions(page);
  await timed("toSelection", () => game.goToTournament());
  // Changing an earlier pick must clear that team from later rounds; checked before the final picks.
  let picks: RecordedPick[] = [];
  await timed("picks", async () => {
    picks = await game.makePicks(1, {
      beforeRound: async (round) => {
        if (round === "finals") await checkCascadeClears(page);
      },
    });
  });
  await timed("tournament", () => game.playTournament());
  console.log(`[phase timings] ${label}: ${times.join(" ")}`);
  return picks;
}

test("plays a full game and restarts into a clean second game @every-size", async ({
  page,
  game,
  backend,
}) => {
  test.setTimeout(2 * GAME_BUDGET_MS + 60_000);

  await game.open();
  const picks = await playToRecap(game, page, "game 1");
  await checkScore(page, await checkHighlights(page));
  const recap = await game.openRecap();
  await expect(recap).toBeVisible();
  await checkRecap(recap, page);
  await checkPersistPayload(backend, picks, null, page);
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

  await playToRecap(game, page, "game 2");
  await game.openRecap();
});

test("reload mid-tournament returns to a clean start", async ({ page, game }) => {
  // The auto `errors` fixture fails this test on any console or page error, including after the reload.
  test.setTimeout(GAME_BUDGET_MS + 60_000);

  // The whole tournament sim runs inside one React commit (state jumps from selection straight
  // to recap, verified by logging every DOM mutation), so no browser-visible "mid" state exists.
  // The closest real window is the recap with the bracket save still in flight: hold that
  // request open, reload while it is pending, and assert that is where we reloaded.
  let saveStarted = false;
  await page.route("**/api/bracket/simulation", () => {
    saveStarted = true; // never fulfilled: the save stays in flight
  });

  await game.open();
  await game.start();
  await game.finishSeason();
  await game.goToTournament();
  await game.makePicks(1);
  await game.playTournament();
  await expect.poll(() => saveStarted, { message: "bracket save in flight" }).toBe(true);
  const before = (await readState(page)).appState;
  expect(before.tournamentRecap, "reloading with the tournament finished but the save pending").toBe(true);

  await page.reload();

  const startButton = page.getByRole("button", { name: "Start the game" });
  await expect(startButton, "phase: start screen after reload").toBeVisible({
    timeout: PHASE_TIMEOUTS.toStart,
  });
  const after = (await readState(page)).appState;
  expect(after.startScreen).toBe(true);
  expect(after.tournamentRecap).toBe(false);
  await expect(page.getByTestId("regular-season")).toHaveCount(0);
  await page.unroute("**/api/bracket/simulation");
  await game.start();
});

test("double-clicking Start plays the season once", async ({ page, game }) => {
  test.setTimeout(PHASE_TIMEOUTS.toSeason + PHASE_TIMEOUTS.season + 60_000);
  await game.open();
  await page.getByRole("button", { name: "Start the game" }).dblclick();
  await game.finishSeason();
  await checkGameCounts(page);
});
