import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { NUMBER_OF_TEAMS, POINTS_PER_WIN } from "@/src/constants";
import { RegularSeasonTeam, GameResult } from "@/types";
import { ConferenceMap } from "@/schemas";

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
      if (action.payload.favoredScore > action.payload.underdogScore) {
        state.records[action.payload.favoredTeam].wins++;
        state.records[action.payload.underdogTeam].losses++;
        state.records[action.payload.favoredTeam].tournamentSelectionScore +=
          NUMBER_OF_TEAMS - action.payload.underdogRPI + POINTS_PER_WIN;
      } else {
        state.records[action.payload.underdogTeam].wins++;
        state.records[action.payload.favoredTeam].losses++;
        state.records[action.payload.underdogTeam].tournamentSelectionScore +=
          NUMBER_OF_TEAMS - action.payload.favoredRPI + POINTS_PER_WIN;
      }
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
