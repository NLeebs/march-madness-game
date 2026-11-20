import { describe, it, expect } from "vitest";
import { simulateSeason } from "@/src/functions/regularSeason/simulateSeason";
import { applySeasonGameResult } from "@/src/functions/regularSeason/applySeasonGameResult";
import { selectTournamentField } from "@/src/functions/regularSeason/selectTournamentField";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import { createFastStore } from "@/tests/game/helpers/fastStore";
import { mulberry32 } from "@/tests/game/helpers/rng";
import { GAME_TEST_TIMEOUT } from "@/tests/game/helpers/timeout";
import type { RegularSeasonTeam } from "@/types";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as object).forEach(deepFreeze);
  }
  return value;
}

const zeroedRecords = (names: string[]): Record<string, RegularSeasonTeam> =>
  Object.fromEntries(
    names.map((n) => [n, { wins: 0, losses: 0, tournamentSelectionScore: 0 }]),
  );

describe("simulateSeason", () => {
  const league = buildLeague();

  it("teamArray matches teamScheduleConfig order", () => {
    const store = createFastStore();
    configureStoreForLeague(store, league);
    const sim = simulateSeason(league.teamStats, mulberry32(7));
    expect(sim.teamArray).toEqual(store.getState().teamSchedule.teamArray);
  }, GAME_TEST_TIMEOUT);

  it("30 weeks; every scheduled game is played once, in schedule order", () => {
    const sim = simulateSeason(league.teamStats, mulberry32(7));
    expect(sim.weeks).toHaveLength(30);
    const scheduled = sim.schedule.map((g) => ({
      week: g.weekNumber,
      teams: g.matchup.map((t) => t.team).sort(),
    }));
    const played = sim.weeks.flatMap((games, i) =>
      games.map((g) => ({
        week: `week${i + 1}`,
        teams: [g.favoredTeam, g.underdogTeam].sort(),
      })),
    );
    const byWeek = [...scheduled].sort(
      (a, b) => Number(a.week.slice(4)) - Number(b.week.slice(4)),
    );
    expect(played).toEqual(byWeek);
  }, GAME_TEST_TIMEOUT);

  it("records equal folding applySeasonGameResult over weeks from zeroed records", () => {
    const sim = simulateSeason(league.teamStats, mulberry32(7));
    const records = zeroedRecords(sim.teamArray.map((t) => t.team));
    sim.weeks.flat().forEach((r) => applySeasonGameResult(records, r));
    expect(sim.records).toEqual(records);
  }, GAME_TEST_TIMEOUT);

  it("selection equals selectTournamentField(records, conferenceArrays)", () => {
    const sim = simulateSeason(league.teamStats, mulberry32(7));
    expect(sim.selection).toEqual(selectTournamentField(sim.records, league.conferenceArrays));
  }, GAME_TEST_TIMEOUT);

  it("same seed gives the same result", () => {
    const a = simulateSeason(league.teamStats, mulberry32(7));
    const b = simulateSeason(league.teamStats, mulberry32(7));
    expect(a).toEqual(b);
  }, GAME_TEST_TIMEOUT);

  it("does not mutate teamStats", () => {
    const frozen = deepFreeze(buildLeague().teamStats);
    expect(() => simulateSeason(frozen, mulberry32(7))).not.toThrow();
  }, GAME_TEST_TIMEOUT);
});
