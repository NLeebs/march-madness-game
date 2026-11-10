import { describe, it, expect, vi, afterEach } from "vitest";
import { createSeasonSchedule } from "@/src/functions";
import { buildLeague, buildConferenceMap } from "@/tests/factories";
import { mulberry32, seedMathRandom } from "@/tests/game/helpers/rng";

const NON_CONF_WEEKS = 15;
const SEASON_WEEKS = 30;

function countingRng(seed: number) {
  const inner = mulberry32(seed);
  let calls = 0;
  return {
    rng: () => {
      calls++;
      return inner();
    },
    calls: () => calls,
  };
}

function oddLeague() {
  const teamStats = buildConferenceMap({
    a: { a1: {}, a2: {}, a3: {} },
    b: { b1: {}, b2: {} },
    c: { c1: {}, c2: {} },
  });
  const teamArray = Object.entries(teamStats).flatMap(([conference, teams]) =>
    Object.keys(teams).map((team) => ({ team, conference })),
  );
  return { teamStats, teamArray };
}

afterEach(() => vi.restoreAllMocks());

describe("createSeasonSchedule", () => {
  it("matches the default rng under a seeded Math.random, without calling Math.random when rng is passed", () => {
    const { teamStats, teamArray } = buildLeague();

    const spy = vi.spyOn(Math, "random");
    const counted = countingRng(7);
    const withRng = createSeasonSchedule(teamStats, teamArray, counted.rng);
    expect(spy).toHaveBeenCalledTimes(0);
    spy.mockRestore();

    const seeded = seedMathRandom(7);
    const withDefault = createSeasonSchedule(teamStats, teamArray);
    const defaultDraws = seeded.calls();
    seeded.restore();

    expect(withRng).toEqual(withDefault);
    expect(counted.calls()).toBe(defaultDraws);
    expect(defaultDraws).toBe(withDefault.length * 2);
  });

  it("returns well-formed games: each team plays at most once a week, non-conference weeks pair everyone", () => {
    const { teamStats, teamArray } = buildLeague();
    const games = createSeasonSchedule(teamStats, teamArray, mulberry32(3));

    const byWeek = new Map<string, string[]>();
    for (const g of games) {
      expect(g.matchup).toHaveLength(2);
      expect(g.matchup[0].team).not.toBe(g.matchup[1].team);
      const teams = byWeek.get(g.weekNumber) ?? [];
      teams.push(g.matchup[0].team, g.matchup[1].team);
      byWeek.set(g.weekNumber, teams);
    }
    expect(Array.from(byWeek.keys()).sort()).toEqual(
      Array.from({ length: SEASON_WEEKS }, (_, i) => `week${i + 1}`).sort(),
    );
    for (const [week, teams] of Array.from(byWeek.entries())) {
      expect(new Set(teams).size).toBe(teams.length);
      const n = Number(week.slice(4));
      if (n <= NON_CONF_WEEKS) expect(teams.length).toBe(teamArray.length);
    }
    // weeks are emitted in ascending order
    const weekNums = games.map((g) => Number(g.weekNumber.slice(4)));
    expect([...weekNums].sort((a, b) => a - b)).toEqual(weekNums);
  });

  it("conference weeks pair within a conference except for the leftover pairing", () => {
    const { teamStats, teamArray } = buildLeague();
    const games = createSeasonSchedule(teamStats, teamArray, mulberry32(5));
    const week16 = games.filter((g) => g.weekNumber === "week16");
    const cross = week16.filter(
      (g) => g.matchup[0].conference !== g.matchup[1].conference,
    );
    const confCount = Object.keys(teamStats).length;
    expect(cross.length).toBeLessThanOrEqual(Math.floor(confCount / 2));
  });

  it("does not mutate teamArray", () => {
    const { teamStats, teamArray } = buildLeague();
    const before = JSON.parse(JSON.stringify(teamArray));
    createSeasonSchedule(teamStats, teamArray, mulberry32(1));
    expect(teamArray).toEqual(before);
  });

  it("handles an odd-sized league: one team sits out, nothing crashes", () => {
    const { teamStats, teamArray } = oddLeague();
    expect(teamArray.length % 2).toBe(1);
    const games = createSeasonSchedule(teamStats, teamArray, mulberry32(9));
    const week1 = games.filter((g) => g.weekNumber === "week1");
    expect(week1).toHaveLength((teamArray.length - 1) / 2);
    const week16 = games.filter((g) => g.weekNumber === "week16");
    // a (3): 1 game + leftover; b (2) and c (2): 1 game each; the lone leftover sits out
    expect(week16).toHaveLength(3);
    expect(createSeasonSchedule(teamStats, teamArray, mulberry32(9))).toEqual(games);
  });
});
