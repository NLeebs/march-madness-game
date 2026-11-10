import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { playFullGame } from "../helpers/fullRun";
import { GAME_TEST_TIMEOUT } from "../helpers/timeout";

type Slot = { team: string; score?: number; win?: boolean };
type ByRegion = Record<string, Slot[][]>;

/** "winner score-loser score" per game, in bracket order (play-in games included for round one). */
function scoreLines(matchups: unknown): string[] {
  const byRegion = matchups as ByRegion & { playin?: Record<string, Slot[][]> };
  const games = [
    ...Object.keys(byRegion)
      .filter((r) => r !== "playin")
      .flatMap((r) => byRegion[r]),
    ...Object.values(byRegion.playin ?? {}).flat(),
  ];
  return games.map((game) => {
    const winner = game.find((t) => t.win);
    const loser = game.find((t) => !t.win);
    return `${winner?.team} ${winner?.score}-${loser?.team} ${loser?.score}`;
  });
}

describe("full game draw order", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("pins the whole seeded run (seed 1): season, field, every round, champion, score, draw count", async () => {
    const { store, draws } = await playFullGame(1);
    const { regularSeasonRecords, tournament } = store.getState();
    const digest = {
      records: Object.fromEntries(
        Object.entries(regularSeasonRecords.records).map(([team, r]) => [
          team,
          `${r.wins}-${r.losses} ${r.tournamentSelectionScore}`,
        ]),
      ),
      conferenceChampions: Object.entries(regularSeasonRecords.records)
        .filter(([, r]) => r.confChampion)
        .map(([team]) => team),
      playinTeams: tournament.playinTeams,
      tournamentSeeds: tournament.tournamentSeeds,
      rounds: {
        one: scoreLines(tournament.roundOneMatchups),
        two: scoreLines(tournament.roundTwoMatchups),
        sweetSixteen: scoreLines(tournament.roundSweetSixteenMatchups),
        eliteEight: scoreLines(tournament.roundEliteEightMatchups),
        finalFour: scoreLines(tournament.roundFinalFourMatchups),
        finals: scoreLines(tournament.roundFinalsMatchups),
      },
      champion: (tournament.champion as unknown as ByRegion).champion[0][0].team,
      playerScore: tournament.playerScore,
      draws,
    };
    expect(digest).toMatchSnapshot();
  }, GAME_TEST_TIMEOUT);
});
