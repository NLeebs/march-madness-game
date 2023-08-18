import { configureStore } from "@reduxjs/toolkit";

import teamStatsSlice from "./teamStatsSlice";


const store = configureStore({
    reducer: {
        teamStats: teamStatsSlice.reducer,
    }
});

export default store;