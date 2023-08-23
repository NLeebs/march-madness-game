import { configureStore } from "@reduxjs/toolkit";

import teamStatsSlice from "./teamStatsSlice";
import teamScheduleSlice from "./teamScheduleSlice";
import appStateSlice from "./appStateSlice";


const store = configureStore({
    reducer: {
        appState: appStateSlice.reducer,
        teamStats: teamStatsSlice.reducer,
        teamSchedule: teamScheduleSlice.reducer,
    }
});

export default store;