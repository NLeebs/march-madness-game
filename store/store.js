import { configureStore } from "@reduxjs/toolkit";

import teamStatsSlice from "./teamStatsSlice";
import teamScheduleSlice from "./teamScheduleSlice";
import appStateSlice from "./appStateSlice";
import uiStateSlice from "./uiStateSlice";
import regularSeasonRecordSlice from "./regularSeasonRecordSlice";
import tournamentSlice from "./tournamentSlice";
import tournamentPlayersPicksSlice from "./tournamentPlayersPicksSlice";


const store = configureStore({
    reducer: {
        appState: appStateSlice.reducer,
        uiState: uiStateSlice.reducer,
        teamStats: teamStatsSlice.reducer,
        teamSchedule: teamScheduleSlice.reducer,
        regularSeasonRecords: regularSeasonRecordSlice.reducer,
        tournament: tournamentSlice.reducer,
        tournamentPlayersPicks: tournamentPlayersPicksSlice.reducer,
    }
});

export default store;