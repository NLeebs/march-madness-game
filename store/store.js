import { configureStore } from "@reduxjs/toolkit";

import teamStatsSlice from "./teamStatsSlice";
import teamScheduleSlice from "./teamScheduleSlice";
import appStateSlice from "./appStateSlice";
import regularSeasonRecordSlice from "./regularSeasonRecordSlice";
import tournamentSlice from "./tournamentSlice";


const store = configureStore({
    reducer: {
        appState: appStateSlice.reducer,
        teamStats: teamStatsSlice.reducer,
        teamSchedule: teamScheduleSlice.reducer,
        regularSeasonRecords: regularSeasonRecordSlice.reducer,
        tournament: tournamentSlice.reducer,
    }
});

export default store;