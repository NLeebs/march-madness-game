import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { playFullGame } from "./helpers/fullRun";
import { GAME_TEST_TIMEOUT } from "./helpers/timeout";

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

const flat = (m: ByRegion): Slot[] =>
  Object.keys(m)
    .filter((r) => r !== "playin")
    .flatMap((r) => m[r].flat());

describe("full game run (season -> Selection Sunday -> tournament)", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // Seeds 1..2: each full run costs ~4 s and tests/game must stay under 40 s.
  it.each([1, 2])(
    "seed %i: a whole game ends with a 68-team field, one champion and a correct score",
    async (seed) => {
      const { league, store, actions, flagSequence } = await playFullGame(seed);
      const state = store.getState();
      const { tournament, tournamentPlayersPicks, regularSeasonRecords } = state;

      // the season was played in full
      expect(regularSeasonRecords.weeksPlayed).toBe(30);
      expect(Object.keys(regularSeasonRecords.records)).toHaveLength(360);

      // Selection Sunday: one champion per conference, 68 distinct teams in the field
      const conferences = Object.keys(league.conferenceArrays);
      const confChampions = Object.entries(regularSeasonRecords.records)
        .filter(([, r]) => r.confChampion)
        .map(([team]) => team);
      expect(confChampions).toHaveLength(conferences.length);
      const field = [
        ...tournament.tournamentTeams,
        ...tournament.playinTeams.sixteenSeeds,
        ...tournament.playinTeams.elevenSeeds,
      ];
      expect(field).toHaveLength(68);
      expect(new Set(field).size).toBe(68);

      // the tournament champion comes from the field and is the finals winner
      const r1 = tournament.roundOneMatchups as unknown as ByRegion;
      const finals = tournament.roundFinalsMatchups as unknown as ByRegion;
      const finalsWinners = flat(finals).filter((t) => t.win);
      expect(finalsWinners).toHaveLength(1);
      const champ = (tournament.champion as unknown as ByRegion).champion[0];
      expect(champ).toHaveLength(1);
      expect(champ[0].team).toBe(finalsWinners[0].team);
      expect(field).toContain(champ[0].team);
      expect(flat(r1).map((t) => t.team)).toContain(champ[0].team);

      // playerScore recomputed from the recorded results and the final picks
      const picks = tournamentPlayersPicks.picks as unknown as Record<string, ByRegion>;
      const results = actions.filter((a) => a.type.endsWith("setTournamentGameResults"));
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

      // every appState flag that became true, in order, from the season to the recap
      // (activateTournament clears every flag, so selectionSunday etc. go false again)
      expect(flagSequence).toEqual([
        "regularSeason",
        "selectionSunday",
        "tournament",
        "tournamentSelection",
        "tournamentPlayPlayinGames",
        "tournamentPlayGames",
        "tournamentPlayRoundOne",
        "tournamentPlayRoundTwo",
        "tournamentPlaySweetSixteen",
        "tournamentPlayEliteEight",
        "tournamentPlayFinalFour",
        "tournamentPlayFinals",
        "tournamentRecap",
      ]);
    },
    GAME_TEST_TIMEOUT,
  );
});
