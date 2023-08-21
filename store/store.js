import { configureStore } from "@reduxjs/toolkit";

import teamStatsSlice from "./teamStatsSlice";
import teamScheduleSlice from "./teamScheduleSlice";


const store = configureStore({
    reducer: {
        teamStats: teamStatsSlice.reducer,
        teamSchedule: teamScheduleSlice.reducer,
    }
});

export default store;