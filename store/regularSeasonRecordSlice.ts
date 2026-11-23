import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { applySeasonGameResult } from "@/src/functions/regularSeason/applySeasonGameResult";
import type { TournamentFieldSelection } from "@/src/functions/regularSeason/selectTournamentField";
import { RegularSeasonTeam, GameResult } from "@/types";
import { ConferenceMap } from "@/models";

/** The server's season: what PlayRegularSeasonGames replays and SelectionSunday dispatches. */
export interface StoredSeason {
  /** weeks[0] = week1 ... weeks[29] = week30, games in schedule order. */
  weeks: GameResult[][];
  selection: TournamentFieldSelection;
}

interface RegularSeasonRecordState {
  weeksPlayed: number;
  records: Record<string, RegularSeasonTeam>;
  /** null until POST /api/season answers. */
  season: StoredSeason | null;
}

interface ConferenceChampionPayload {
  confChampion: string;
}

const initialState: RegularSeasonRecordState = {
  weeksPlayed: 0,
  records: {},
  season: null,
};

const regularSeasonRecordSlice = createSlice({
  name: "regularSeasonRecords",
  initialState,
  reducers: {
    restartGame: () => initialState,
    regularSeasonRecordConfig: (
      state,
      action: PayloadAction<ConferenceMap>
    ) => {
      const conferences = Object.keys(action.payload);
      conferences.forEach((conf) => {
        const teams = Object.keys(action.payload[conf]);
        teams.forEach((team) => {
          state.records[team] = {
            wins: 0,
            losses: 0,
            tournamentSelectionScore: 0,
          };
        });
      });
    },
    setSeason: (state, action: PayloadAction<StoredSeason>) => {
      state.season = action.payload;
    },
    addRegularSeasonGameResult: (state, action: PayloadAction<GameResult>) => {
      applySeasonGameResult(state.records, action.payload);
    },
    /** A whole replayed week, games applied in schedule order (one notification instead of ~180). */
    addRegularSeasonWeekResults: (
      state,
      action: PayloadAction<GameResult[]>
    ) => {
      action.payload.forEach((result) =>
        applySeasonGameResult(state.records, result)
      );
    },
    addWeekPlayedToTotal: (state) => {
      state.weeksPlayed++;
    },
    addConferenceChampion: (
      state,
      action: PayloadAction<ConferenceChampionPayload>
    ) => {
      state.records[action.payload.confChampion].confChampion = true;
    },
  },
});

export const regularSeasonRecordActions = regularSeasonRecordSlice.actions;
export default regularSeasonRecordSlice;
