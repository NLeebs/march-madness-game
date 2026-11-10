import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import type { AnyAction } from "@reduxjs/toolkit";
import { SelectionSunday } from "@/src/components/RegularSeason/SelectionSunday";
import { createFastStore } from "./helpers/fastStore";
import { recordActions, renderWithStore } from "./helpers/renderWithStore";
import { buildRecords, pickChalk, playTournament } from "./helpers/runGame";
import { seedMathRandom } from "./helpers/rng";
import { tournamentActions } from "@/store";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";

afterEach(() => cleanup());

const league = buildLeague();
const confs = Object.keys(league.conferenceArrays);
const champions = confs.map((c) => league.conferenceArrays[c][0]);

type Slot = { team: string; seed: number | string; win?: boolean };
type ByRegion = Record<string, Slot[][]>;

const POINTS = [10, 20, 40, 80, 160, 320];
const ROUNDS = [1, 2, "sweet sixteen", "elite eight", "final four", "finals"];
const PICK_KEYS = [
  "roundTwoPicks",
  "roundSweetSixteenPicks",
  "roundEliteEightPicks",
  "roundFinalFourPicks",
  "roundFinalsPicks",
  "champion",
] as const;
const PLACEHOLDERS = [
  "playinGameSeed16Game1",
  "playinGameSeed16Game2",
  "playinGameSeed11Game1",
  "playinGameSeed11Game2",
];

/** Builds a field from hand-built records (no season), by running Selection Sunday. */
function fieldStore(variant: number) {
  const records = buildRecords(league, (team, i) => ({
    wins: champions.includes(team) ? 20 : 10,
    // distinct scores (37 is coprime to 360), shuffled per variant
    score: 1000 - ((i * 37 + variant * 11) % 360),
  }));
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
    },
  });
  const view = renderWithStore(<SelectionSunday />, store);
  view.unmount();
  return { store, actions };
}

const flat = (m: ByRegion): Slot[] =>
  Object.keys(m)
    .filter((r) => r !== "playin")
    .flatMap((r) => m[r].flat());

describe("pickChalk", () => {
  it("picks the better seed in every game, round by round, placeholders included", () => {
    const { store } = fieldStore(1);
    store.dispatch(tournamentActions.setRoundOneMatchups());
    pickChalk(store);
    const { tournament, tournamentPlayersPicks } = store.getState();
    const picks = tournamentPlayersPicks.picks as unknown as Record<string, ByRegion>;

    // round one -> roundTwoPicks: the pick at game g is the better seed of game g
    const r1 = tournament.roundOneMatchups as unknown as ByRegion;
    for (const region of ["west", "east", "south", "midwest"]) {
      r1[region].forEach((game, g) => {
        const better = Number(game[1].seed) < Number(game[0].seed) ? game[1] : game[0];
        const slot = picks.roundTwoPicks[region][Math.floor(g / 2)][g % 2];
        expect(slot.team).toBe(better.team);
        expect(Number(slot.seed)).toBe(Number(better.seed));
      });
    }
    // every slot of every later round is filled: 32 + 16 + 8 + 4 + 2 + 1
    const filled = (key: string) =>
      Object.values(picks[key])
        .flatMap((ms) => ms.flat())
        .filter((t) => t.team !== "");
    expect(PICK_KEYS.map((k) => filled(k).length)).toEqual([32, 16, 8, 4, 2, 1]);
    // the 16-seed placeholder never beats a 1 seed under chalk
    expect(PLACEHOLDERS.slice(0, 2)).not.toContain(picks.champion.champion[0][0].team);
  });
});

describe("playTournament invariants", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])("seed %i", async (seed) => {
    const { store, actions } = fieldStore(seed);
    const seeded = seedMathRandom(seed);
    try {
      const before = actions.length;
      await playTournament(store);
      const mine = actions.slice(before);
      const { tournament, tournamentPlayersPicks, appState } = store.getState();
      const picks = tournamentPlayersPicks.picks as unknown as Record<string, ByRegion>;
      expect(appState.tournamentRecap).toBe(true);

      // play-in winners occupy the four placeholder slots; placeholders are gone
      const r1 = tournament.roundOneMatchups as unknown as ByRegion & {
        playin: Record<string, Slot[][]>;
      };
      const winnerOf = (seedType: string, g: number) => {
        const game = r1.playin[seedType][g];
        expect(game.filter((t) => t.win)).toHaveLength(1);
        return game.find((t) => t.win)!.team;
      };
      expect(r1.west[0][1].team).toBe(winnerOf("sixteenSeeds", 0));
      expect(r1.east[0][1].team).toBe(winnerOf("sixteenSeeds", 1));
      expect(r1.south[4][1].team).toBe(winnerOf("elevenSeeds", 0));
      expect(r1.midwest[4][1].team).toBe(winnerOf("elevenSeeds", 1));
      const everyTeam = [
        ...flat(r1),
        ...PICK_KEYS.flatMap((k) => flat(picks[k])),
      ].map((t) => t.team);
      PLACEHOLDERS.forEach((p) => expect(everyTeam).not.toContain(p));

      // halving rounds, one winner per matchup, only winners advance
      const matchups = [
        r1 as ByRegion,
        tournament.roundTwoMatchups,
        tournament.roundSweetSixteenMatchups,
        tournament.roundEliteEightMatchups,
        tournament.roundFinalFourMatchups,
        tournament.roundFinalsMatchups,
      ] as unknown as ByRegion[];
      expect(matchups.map((m) => flat(m).length)).toEqual([64, 32, 16, 8, 4, 2]);
      const winners = matchups.map((m) =>
        Object.keys(m)
          .filter((r) => r !== "playin")
          .flatMap((r) => m[r])
          .map((game) => {
            expect(game.filter((t) => t.win === true)).toHaveLength(1);
            expect(game.filter((t) => t.win === false)).toHaveLength(1);
            return game.find((t) => t.win)!.team;
          }),
      );
      expect(winners.map((w) => w.length)).toEqual([32, 16, 8, 4, 2, 1]);
      matchups.slice(1).forEach((m, i) => {
        expect(flat(m).map((t) => t.team).sort()).toEqual([...winners[i]].sort());
      });

      // champion is the finals winner
      const champ = (tournament.champion as unknown as ByRegion).champion[0];
      expect(champ).toHaveLength(1);
      expect(champ[0].team).toBe(winners[5][0]);

      // playerScore recomputed from the recorded results and the final picks
      const results = mine.filter((a) => a.type.endsWith("setTournamentGameResults"));
      let expected = 0;
      ROUNDS.forEach((round, r) => {
        const won = results
          .filter((a) => a.payload.round === round)
          .map((a) => a.payload.results.winningTeam as string);
        expect(won).toHaveLength(32 / 2 ** r);
        flat(picks[PICK_KEYS[r]]).forEach((slot) => {
          if (won.includes(slot.team)) expected += POINTS[r];
        });
      });
      expect(tournament.playerScore).toBe(expected);

      // phase flags and the recap dialog
      const phases = mine
        .map((a: AnyAction) => a.type as string)
        .filter((t) => t.startsWith("appState/"))
        .map((t) => t.replace("appState/", ""));
      expect(phases).toEqual([
        "activateTournament",
        "activateTournamentSelectionStage",
        "activateTournamentPlayinGamesState",
        "activateTournamentStandardGames",
        "activateTournamentRoundTwo",
        "activateTournamentSweetSixteen",
        "activateTournamentEliteEight",
        "activateTournamentFinalFour",
        "activateTournamentFinals",
        "activateTournamentRecap",
      ]);
      expect(mine.filter((a) => a.type === "uiState/toggleRecapDialog")).toHaveLength(1);
      expect(store.getState().uiState.isRecapDialogOpen).toBe(true);
    } finally {
      seeded.restore();
    }
  });
});
