import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ConferenceMap } from "@/schemas";
import { ConferenceArrays } from "@/types";

interface TeamStatsState {
  teamStats?: ConferenceMap;
  conferenceArrays: ConferenceArrays;
}

const initialState: TeamStatsState = {
  conferenceArrays: {},
};

const teamStatsSlice = createSlice({
  name: "teamStats",
  initialState,
  reducers: {
    addToStateFromDB(state, action: PayloadAction<ConferenceMap>) {
      state.teamStats = { ...action.payload };
    },
    addConferenceArrays(state, action: PayloadAction<ConferenceMap>) {
      Object.keys(action.payload).forEach((conf) => {
        state.conferenceArrays[conf] = Object.keys(action.payload[conf]);
      });
    },
  },
});

export const teamStatsActions = teamStatsSlice.actions;
export default teamStatsSlice;
