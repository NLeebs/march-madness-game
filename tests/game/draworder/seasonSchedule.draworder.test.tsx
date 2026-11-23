import { describe, it, expect } from "vitest";
import { teamScheduleActions } from "@/store";
import { createSeasonSchedule } from "@/src/functions/regularSeason/createSeasonSchedule";
import { createFastStore } from "../helpers/fastStore";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import { seedMathRandom } from "../helpers/rng";
import { GAME_TEST_TIMEOUT } from "../helpers/timeout";

describe("SeasonSchedule draw order", () => {
  it("pins the full schedule and Math.random draw count for seed 1", () => {
    const league = buildLeague();
    const store = createFastStore();
    configureStoreForLeague(store, league);
    const seeded = seedMathRandom(1);
    let draws = 0;
    try {
      store.dispatch(
        teamScheduleActions.setSeasonSchedule(
          createSeasonSchedule(league.teamStats, store.getState().teamSchedule.teamArray),
        ),
      );
      draws = seeded.calls();
    } finally {
      seeded.restore();
    }
    const schedule = Object.fromEntries(
      Object.entries(store.getState().teamSchedule.teamSchedules).map(
        ([week, games]) => [week, games.map(([a, b]) => `${a.team}-${b.team}`)],
      ),
    );
    expect({ schedule, draws }).toMatchSnapshot();
  }, GAME_TEST_TIMEOUT);
});
