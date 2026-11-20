import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { applySeasonGameResult } from "@/src/functions/regularSeason/applySeasonGameResult";
import { RegularSeasonTeam, GameResult } from "@/types";
import { ConferenceMap } from "@/models";

interface RegularSeasonRecordState {
  weeksPlayed: number;
  records: Record<string, RegularSeasonTeam>;
}

interface ConferenceChampionPayload {
  confChampion: string;
}

const initialState: RegularSeasonRecordState = {
  weeksPlayed: 0,
  records: {},
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
    addRegularSeasonGameResult: (state, action: PayloadAction<GameResult>) => {
      applySeasonGameResult(state.records, action.payload);
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
