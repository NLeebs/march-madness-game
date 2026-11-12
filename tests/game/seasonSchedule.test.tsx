import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { SeasonSchedule } from "@/src/components/RegularSeason/SeasonSchedule";
import { createFastStore } from "./helpers/fastStore";
import type { AppStore } from "@/store/store";
import {
  buildLeague,
  buildConferenceMap,
  configureStoreForLeague,
} from "@/tests/factories";
import type { League } from "@/tests/factories";
import { renderWithStore, recordActions } from "./helpers/renderWithStore";
import { seedMathRandom } from "./helpers/rng";
import { GAME_TEST_TIMEOUT } from "./helpers/timeout";

const NON_CONF_WEEKS = 15;
const SEASON_WEEKS = 30;

function renderSchedule(league: League, seed: number) {
  const store: AppStore = createFastStore();
  configureStoreForLeague(store, league);
  const teamArray = store.getState().teamSchedule.teamArray;
  const before = JSON.parse(JSON.stringify(teamArray));
  const seeded = seedMathRandom(seed);
  let draws = 0;
  try {
    renderWithStore(
      <SeasonSchedule teamStats={league.teamStats} teamArray={teamArray} />,
      store,
    );
    draws = seeded.calls();
  } finally {
    seeded.restore();
  }
  return {
    store,
    before,
    draws,
    schedules: store.getState().teamSchedule.teamSchedules,
  };
}

function leagueFromSizes(sizes: number[]): League {
  const conferences: Record<string, Record<string, object>> = {};
  sizes.forEach((size, c) => {
    conferences[`conf${c + 1}`] = {};
    for (let k = 0; k < size; k++)
      conferences[`conf${c + 1}`][`c${c + 1}t${k + 1}`] = {};
  });
  const teamStats = buildConferenceMap(conferences);
  const conferenceArrays = Object.fromEntries(
    Object.entries(teamStats).map(([c, teams]) => [c, Object.keys(teams)]),
  );
  const teamArray = Object.entries(teamStats).flatMap(([conference, teams]) =>
    Object.keys(teams).map((team) => ({ team, conference })),
  );
  return { teamStats, conferenceArrays, teamArray };
}

describe("SeasonSchedule", () => {
  afterEach(() => cleanup());

  const checkInvariants = (league: League, seeds: number[]) => {
    const sizes = Object.values(league.conferenceArrays).map((t) => t.length);
    const oddConfs = sizes.filter((n) => n % 2 === 1).length;
    const confOf = new Map(league.teamArray.map((t) => [t.team, t.conference]));
    const oddConfNames = new Set(
      Object.entries(league.conferenceArrays)
        .filter(([, teams]) => teams.length % 2 === 1)
        .map(([c]) => c),
    );
    const confGamesPerWeek =
      sizes.reduce((s, n) => s + Math.floor(n / 2), 0) +
      Math.floor(oddConfs / 2);
    expect(league.teamArray.length % 2).toBe(0);
    expect(oddConfs).toBeGreaterThan(0);

    for (const seed of seeds) {
      const { schedules, before, store, draws } = renderSchedule(league, seed);
      cleanup();

      expect(Object.keys(schedules)).toHaveLength(SEASON_WEEKS);
      let total = 0;
      for (let w = 1; w <= SEASON_WEEKS; w++) {
        const games = schedules[`week${w}`];
        total += games.length;
        const seen = new Set<string>();
        let crossConf = 0;
        // collected per week: one expect per week keeps the 5,400-game sweep fast
        const problems: string[] = [];
        for (const [a, b] of games) {
          if (a.team === b.team) problems.push(`${a.team} plays itself`);
          if (a.conference !== confOf.get(a.team))
            problems.push(`bad conference ${a.team}`);
          if (b.conference !== confOf.get(b.team))
            problems.push(`bad conference ${b.team}`);
          if (seen.has(a.team)) problems.push(`${a.team} twice in week${w}`);
          if (seen.has(b.team)) problems.push(`${b.team} twice in week${w}`);
          seen.add(a.team);
          seen.add(b.team);
          if (w > NON_CONF_WEEKS && a.conference !== b.conference) {
            crossConf++;
            if (
              !oddConfNames.has(a.conference) ||
              !oddConfNames.has(b.conference)
            ) {
              problems.push(
                `cross-conference game outside leftovers: ${a.team}-${b.team}`,
              );
            }
          }
        }
        expect(problems).toEqual([]);
        if (w <= NON_CONF_WEEKS) {
          expect(games).toHaveLength(league.teamArray.length / 2);
          expect(seen.size).toBe(league.teamArray.length);
        } else {
          expect(crossConf).toBeLessThanOrEqual(oddConfs);
          expect(crossConf).toBe(Math.floor(oddConfs / 2));
          expect(games).toHaveLength(confGamesPerWeek);
          // even league: nobody missing
          expect(seen.size).toBe(league.teamArray.length);
        }
      }
      expect(total).toBe(
        NON_CONF_WEEKS * (league.teamArray.length / 2) +
          (SEASON_WEEKS - NON_CONF_WEEKS) * confGamesPerWeek,
      );
      // two Math.random draws per scheduled game, none otherwise
      expect(draws).toBe(total * 2);
      // the component must not mutate store data
      expect(store.getState().teamSchedule.teamArray).toEqual(before);
    }
  };

  // A smaller league with mixed parity: even total, several odd-sized conferences.
  it("holds schedule invariants across 20 seeds on a small mixed-parity league", () => {
    checkInvariants(
      leagueFromSizes([5, 4, 7, 3, 6, 5]),
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  }, GAME_TEST_TIMEOUT);

  it("holds schedule invariants across 20 seeds on the 360-team league", () => {
    const league = buildLeague();
    expect(league.teamArray).toHaveLength(360);
    checkInvariants(
      league,
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  }, GAME_TEST_TIMEOUT);

  it("dispatches the whole schedule as one setSeasonSchedule action", () => {
    const league = buildLeague();
    const { middleware, actions } = recordActions();
    const recorded = createFastStore({ extraMiddleware: [middleware] });
    configureStoreForLeague(recorded, league);
    const teamArray = recorded.getState().teamSchedule.teamArray;
    actions.length = 0;
    renderWithStore(
      <SeasonSchedule teamStats={league.teamStats} teamArray={teamArray} />,
      recorded,
    );
    const types = actions.map((a) => a.type);
    expect(types.filter((t) => t === "teamSchedule/setSeasonSchedule")).toHaveLength(1);
    expect(types.filter((t) => t === "teamSchedule/addGameToTeamSchedule")).toHaveLength(0);
    expect(types).toHaveLength(1);
  }, GAME_TEST_TIMEOUT);

  it("does nothing when the team array is empty", () => {
    const store = createFastStore();
    renderWithStore(<SeasonSchedule teamStats={{}} teamArray={[]} />, store);
    expect(store.getState().teamSchedule.teamSchedules).toEqual({});
  });

  it("pins odd-total behaviour for 3 conferences of 3 teams", () => {
    const league = leagueFromSizes([3, 3, 3]);
    for (let seed = 1; seed <= 5; seed++) {
      const { schedules } = renderSchedule(league, seed);
      cleanup();
      for (let w = 1; w <= SEASON_WEEKS; w++) {
        const games = schedules[`week${w}`];
        const seen = new Set(games.flatMap(([a, b]) => [a.team, b.team]));
        // current behaviour: 9 teams -> 4 games, exactly one team has no game
        // (non-conference weeks: the last unpaired team; conference weeks: one
        // of the three leftover teams, since an odd leftover count leaves one out)
        expect(games).toHaveLength(4);
        expect(seen.size).toBe(8);
        games.forEach(([a, b]) => expect(a.team).not.toBe(b.team));
        if (w > NON_CONF_WEEKS) {
          const cross = games.filter(([a, b]) => a.conference !== b.conference);
          expect(cross).toHaveLength(1);
          expect(games.length - cross.length).toBe(3);
        }
      }
    }
  });
});
