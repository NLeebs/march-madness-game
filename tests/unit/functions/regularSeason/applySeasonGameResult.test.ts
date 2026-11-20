import { describe, it, expect } from "vitest";
import { applySeasonGameResult } from "@/src/functions/regularSeason/applySeasonGameResult";
import { NUMBER_OF_TEAMS, POINTS_PER_WIN } from "@/src/constants";
import type { GameResult, RegularSeasonTeam } from "@/types";

const zeroed = (): Record<string, RegularSeasonTeam> => ({
  Fav: { wins: 0, losses: 0, tournamentSelectionScore: 0 },
  Dog: { wins: 0, losses: 0, tournamentSelectionScore: 0 },
});

const game = (favoredScore: number, underdogScore: number): GameResult => ({
  favoredTeam: "Fav",
  underdogTeam: "Dog",
  favoredScore,
  underdogScore,
  favoredRPI: 10,
  underdogRPI: 200,
});

describe("applySeasonGameResult", () => {
  it("favored win: +1 win, +1 loss, winner gets 360 - underdogRPI + 75", () => {
    const records = zeroed();
    applySeasonGameResult(records, game(70, 60));
    expect(records.Fav).toEqual({
      wins: 1,
      losses: 0,
      tournamentSelectionScore: NUMBER_OF_TEAMS - 200 + POINTS_PER_WIN,
    });
    expect(records.Dog).toEqual({ wins: 0, losses: 1, tournamentSelectionScore: 0 });
    expect(records.Fav.tournamentSelectionScore).toBe(360 - 200 + 75);
  });

  it("underdog win: winner gets 360 - favoredRPI + 75", () => {
    const records = zeroed();
    applySeasonGameResult(records, game(60, 70));
    expect(records.Dog).toEqual({ wins: 1, losses: 0, tournamentSelectionScore: 360 - 10 + 75 });
    expect(records.Fav).toEqual({ wins: 0, losses: 1, tournamentSelectionScore: 0 });
  });
});
