import { describe, it, expect } from "vitest";
import { simulateSeason } from "@/src/functions/regularSeason/simulateSeason";
import {
  compactSeason,
  expandSeason,
} from "@/src/functions/regularSeason/seasonWire";
import { GameDataError } from "@/src/functions/generic/GameDataError";
import { buildLeague } from "@/tests/factories";
import { mulberry32 } from "@/tests/game/helpers/mulberry32";
import { GAME_TEST_TIMEOUT } from "@/tests/game/helpers/timeout";

describe("seasonWire", () => {
  const league = buildLeague();
  const season = simulateSeason(league.teamStats, mulberry32(3));

  it("round trip: weeks deep-equal", () => {
    const out = expandSeason(compactSeason(season), league.teamStats);
    expect(out.weeks).toEqual(season.weeks);
    expect(out.selection).toEqual(season.selection);
  }, GAME_TEST_TIMEOUT);

  it("round trip: schedule deep-equals", () => {
    const out = expandSeason(compactSeason(season), league.teamStats);
    expect(out.schedule).toEqual(season.schedule);
  }, GAME_TEST_TIMEOUT);

  it("survives a JSON round trip", () => {
    const wire = JSON.parse(JSON.stringify(compactSeason(season)));
    expect(expandSeason(wire, league.teamStats).weeks).toEqual(season.weeks);
  }, GAME_TEST_TIMEOUT);

  it("JSON size of the wire is under 25% of the full results", () => {
    const wire = JSON.stringify(compactSeason(season)).length;
    const full = JSON.stringify({
      schedule: season.schedule,
      weeks: season.weeks,
    }).length;
    expect(wire).toBeLessThan(full * 0.25);
  }, GAME_TEST_TIMEOUT);

  it("throws GameDataError for a team missing from teamStats", () => {
    const wire = compactSeason(season);
    const { conference } = wire.teams[0];
    const stats = { ...league.teamStats, [conference]: {} };
    expect(() => expandSeason(wire, stats)).toThrow(GameDataError);
  }, GAME_TEST_TIMEOUT);
});
