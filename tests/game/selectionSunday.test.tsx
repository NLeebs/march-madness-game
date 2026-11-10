import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import type { AnyAction } from "@reduxjs/toolkit";
import { SelectionSunday } from "@/src/components/RegularSeason/SelectionSunday";
import { NUMBER_OF_AT_LARGE_TEAMS } from "@/src/constants";
import { createFastStore } from "./helpers/fastStore";
import { recordActions, renderWithStore } from "./helpers/renderWithStore";
import { buildRecords } from "./helpers/runGame";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import type { RegularSeasonTeam } from "@/types";

afterEach(() => cleanup());

const league = buildLeague();
const confs = Object.keys(league.conferenceArrays);
const N = confs.length;
const allTeams = confs.flatMap((c) => league.conferenceArrays[c]);
const confOf = (team: string) =>
  confs.find((c) => league.conferenceArrays[c].includes(team)) as string;
const firstOf = (c: string) => league.conferenceArrays[c][0];
// Champion = first team of each conference.
const champions = confs.map(firstOf);
const idx = (t: string) => allTeams.indexOf(t);
const nonChampions = allTeams.filter((t) => !champions.includes(t));

/** Renders SelectionSunday on a store preloaded with the given records. */
function run(
  records: Record<string, RegularSeasonTeam>,
  tournamentTeams: string[] = [],
) {
  const seedStore = createFastStore();
  configureStoreForLeague(seedStore, league);
  const base = seedStore.getState();
  const { middleware, actions } = recordActions();
  const store = createFastStore({
    extraMiddleware: [middleware],
    preloadedState: {
      ...base,
      regularSeasonRecords: { weeksPlayed: 30, records },
      appState: { ...base.appState, selectionSunday: true },
      tournament: { ...base.tournament, tournamentTeams },
    },
  });
  renderWithStore(<SelectionSunday />, store);
  return { store, actions };
}

const playins = (actions: AnyAction[], seed: number) =>
  actions
    .filter((a) => a.type.endsWith("setPlayinTeams") && a.payload.seed === seed)
    .map((a) => a.payload.team as string);

const champActions = (actions: AnyAction[]) =>
  actions
    .filter((a) => a.type.endsWith("addConferenceChampion"))
    .map((a) => a.payload.confChampion as string);

// First team of each conference wins 20, the rest 10. Score falls with league
// index (1000 - i), so a higher index means a lower score.
const baseRecords = () =>
  buildRecords(league, (team, i) => ({
    wins: champions.includes(team) ? 20 : 10,
    score: 1000 - i,
  }));

describe("Selection Sunday", () => {
  it("picks each conference's most-wins team as champion and flags it", () => {
    const { store, actions } = run(baseRecords());
    expect(champActions(actions)).toEqual(champions);
    const records = store.getState().regularSeasonRecords.records;
    expect(Object.keys(records).filter((t) => records[t].confChampion)).toEqual(
      champions,
    );
  });

  it("breaks conference title ties by highest selection score", () => {
    const [c1, c2, c3] = confs;
    const t1 = league.conferenceArrays[c1];
    const t2 = league.conferenceArrays[c2];
    const t3 = league.conferenceArrays[c3];
    // c1: two-way tie (t1[0], t1[1]); t1[1] has the higher score.
    // c2: three-way tie (t2[0..2]); t2[2] has the highest score.
    // c3: every team tied on wins; t3[3] has the highest score.
    const records = buildRecords(league, (team, i) => {
      const score = 1000 - i;
      if (t1.includes(team))
        return { wins: t1.indexOf(team) < 2 ? 20 : 10, score: team === t1[1] ? 5000 : score };
      if (t2.includes(team))
        return { wins: t2.indexOf(team) < 3 ? 20 : 10, score: team === t2[2] ? 5000 : score };
      if (t3.includes(team))
        return { wins: 12, score: team === t3[3] ? 5000 : score };
      return { wins: team === firstOf(confOf(team)) ? 20 : 10, score };
    });
    const { actions } = run(records);
    const champs = champActions(actions);
    expect(champs.slice(0, 3)).toEqual([t1[1], t2[2], t3[3]]);
    expect(champs.slice(3)).toEqual(champions.slice(3));
  });

  it("sends the 4 lowest-scoring champions to the 16-seed play-ins, lowest first", () => {
    const { store, actions } = run(baseRecords());
    const expected = [
      champions[N - 1],
      champions[N - 2],
      champions[N - 3],
      champions[N - 4],
    ];
    expect(playins(actions, 16)).toEqual(expected);
    expect(store.getState().tournament.playinTeams.sixteenSeeds).toEqual(expected);
  });

  it("takes the top non-champions as at-large, last 4 to the 11-seed play-ins in descending score order", () => {
    const { store, actions } = run(baseRecords());
    // Non-champions in descending score order == league order.
    const atLarge = nonChampions.slice(0, NUMBER_OF_AT_LARGE_TEAMS);
    expect(atLarge).toHaveLength(68 - N);
    const expected = atLarge.slice(-4);
    expect(playins(actions, 11)).toEqual(expected);
    expect(store.getState().tournament.playinTeams.elevenSeeds).toEqual(expected);
  });

  it("builds a 60-team field sorted by score with 68 distinct teams in all", () => {
    const { store } = run(baseRecords());
    const { tournamentTeams, playinTeams } = store.getState().tournament;
    const atLarge = nonChampions.slice(0, NUMBER_OF_AT_LARGE_TEAMS);
    const expectedField = [
      ...champions.slice(0, N - 4),
      ...atLarge.slice(0, atLarge.length - 4),
    ].sort((a, b) => idx(a) - idx(b));
    expect(tournamentTeams).toHaveLength(60);
    expect(tournamentTeams).toEqual(expectedField);
    const all = [
      ...tournamentTeams,
      ...playinTeams.sixteenSeeds,
      ...playinTeams.elevenSeeds,
    ];
    expect(all).toHaveLength(68);
    expect(new Set(all).size).toBe(68);
  });

  it("resolves selection-score ties by Object.keys(records) order", () => {
    // Every champion scores 800, every non-champion 500.
    const records = buildRecords(league, (team) => ({
      wins: champions.includes(team) ? 20 : 10,
      score: champions.includes(team) ? 800 : 500,
    }));
    const { store, actions } = run(records);
    // Play-in boundary: the stable sort keeps conference order, last 4 popped.
    expect(playins(actions, 16)).toEqual([
      champions[N - 1],
      champions[N - 2],
      champions[N - 3],
      champions[N - 4],
    ]);
    // At-large cutoff: the first 68-N non-champions in key order.
    const atLarge = nonChampions.slice(0, 68 - N);
    expect(playins(actions, 11)).toEqual(atLarge.slice(-4));
    expect(store.getState().tournament.tournamentTeams).toEqual([
      ...champions.slice(0, N - 4),
      ...atLarge.slice(0, 68 - N - 4),
    ]);
  });

  it("dispatches champions, 16-seed play-ins, 11-seed play-ins, field, then seeds", () => {
    const { actions } = run(baseRecords());
    const types = actions.map((a) => a.type.split("/").pop());
    expect(types).toEqual([
      ...Array(N).fill("addConferenceChampion"),
      ...Array(8).fill("setPlayinTeams"),
      "addTournamentTeams",
      "setTournamentSeeds",
    ]);
    const seeds = actions
      .filter((a) => a.type.endsWith("setPlayinTeams"))
      .map((a) => a.payload.seed);
    expect(seeds).toEqual([16, 16, 16, 16, 11, 11, 11, 11]);
  });

  it("dispatches nothing when tournamentTeams is already set", () => {
    const { actions } = run(baseRecords(), [allTeams[0]]);
    expect(actions).toEqual([]);
  });
});
