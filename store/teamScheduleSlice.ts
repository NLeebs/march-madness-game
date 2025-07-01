import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AMOUNT_SEASON_GAMES } from "@/src/constants";
import { TeamSchedule, TeamSchedules } from "@/types";

interface TeamScheduleState {
  teamArray: TeamSchedule[];
  teamSchedules: TeamSchedules;
}

interface TeamScheduleConfigPayload {
  [conference: string]: {
    [team: string]: any;
  };
}

interface AddGameToTeamSchedulePayload {
  weekNumber: string;
  matchup: TeamSchedule[];
}

const initialState: TeamScheduleState = {
  teamArray: [],
  teamSchedules: {},
};

const teamScheduleSlice = createSlice({
  name: "teamSchedule",
  initialState,
  reducers: {
    restartGame: () => initialState,
    teamScheduleConfig(
      state,
      action: PayloadAction<TeamScheduleConfigPayload>
    ) {
      state.teamArray = [];
      const conferences = Object.keys(action.payload);
      conferences.forEach((conf) => {
        const teams = Object.keys(action.payload[conf]);
        teams.forEach((team) => {
          state.teamArray.push({
            team: team,
            conference: conf,
          });
        });
      });

      state.teamSchedules = {};
      for (let i = 1; i <= AMOUNT_SEASON_GAMES; i++) {
        const key = `week${i}`;
        state.teamSchedules[key] = [];
      }
    },
    addGameToTeamSchedule(
      state,
      action: PayloadAction<AddGameToTeamSchedulePayload>
    ) {
      state.teamSchedules[action.payload.weekNumber].push(
        action.payload.matchup
      );
    },
  },
});

export const teamScheduleActions = teamScheduleSlice.actions;
export default teamScheduleSlice;
