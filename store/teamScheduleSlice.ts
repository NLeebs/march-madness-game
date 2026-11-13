import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AMOUNT_SEASON_GAMES } from "@/src/constants";
import { TeamSchedule, TeamSchedules } from "@/types";
import type { ConferenceMap } from "@/models";
import type { ScheduledGame } from "@/src/functions/regularSeason/createSeasonSchedule";

interface TeamScheduleState {
  teamArray: TeamSchedule[];
  teamSchedules: TeamSchedules;
}

type TeamScheduleConfigPayload = ConferenceMap;

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
    setSeasonSchedule(state, action: PayloadAction<ScheduledGame[]>) {
      action.payload.forEach(({ weekNumber, matchup }) => {
        state.teamSchedules[weekNumber].push(matchup);
      });
    },
  },
});

export const teamScheduleActions = teamScheduleSlice.actions;
export default teamScheduleSlice;
