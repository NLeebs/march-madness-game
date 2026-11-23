import { describe, it, expect } from "vitest";
import { createAppStore } from "@/store/store";
import { regularSeasonRecordActions, tournamentActions } from "@/store";
import type { GameResult } from "@/types";
import type { TournamentFieldSelection } from "@/src/functions/regularSeason/selectTournamentField";

const GAME: GameResult = {
  favoredTeam: "A",
  favoredScore: 70,
  favoredRPI: 1,
  underdogTeam: "B",
  underdogScore: 60,
  underdogRPI: 2,
};

const SELECTION: TournamentFieldSelection = {
  conferenceChampions: ["A"],
  sixteenSeedPlayins: [],
  elevenSeedPlayins: [],
  field: ["A"],
};

describe("regularSeasonRecordSlice season", () => {
  it("starts with no season", () => {
    expect(createAppStore().getState().regularSeasonRecords.season).toBeNull();
  });

  it("setSeason stores the weeks and the selection", () => {
    const store = createAppStore();
    store.dispatch(
      regularSeasonRecordActions.setSeason({ weeks: [[GAME]], selection: SELECTION })
    );
    expect(store.getState().regularSeasonRecords.season).toEqual({
      weeks: [[GAME]],
      selection: SELECTION,
    });
  });

  it("restartGame clears season and fieldToken", () => {
    const store = createAppStore();
    store.dispatch(
      regularSeasonRecordActions.setSeason({ weeks: [[GAME]], selection: SELECTION })
    );
    store.dispatch(tournamentActions.setFieldToken("token"));

    store.dispatch(regularSeasonRecordActions.restartGame());
    store.dispatch(tournamentActions.restartGame());

    expect(store.getState().regularSeasonRecords.season).toBeNull();
    expect(store.getState().tournament.fieldToken).toBe("");
  });
});
