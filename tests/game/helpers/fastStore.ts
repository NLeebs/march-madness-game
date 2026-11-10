import { configureStore } from "@reduxjs/toolkit";
import appStateSlice from "@/store/appStateSlice";
import uiStateSlice from "@/store/uiStateSlice";
import teamStatsSlice from "@/store/teamStatsSlice";
import teamScheduleSlice from "@/store/teamScheduleSlice";
import regularSeasonRecordSlice from "@/store/regularSeasonRecordSlice";
import tournamentSlice from "@/store/tournamentSlice";
import tournamentPlayersPicksSlice from "@/store/tournamentPlayersPicksSlice";
import type { AppStore } from "@/store/store";

/**
 * Same reducers as createAppStore, but without Redux Toolkit's dev-only
 * immutability/serializability middleware. Those checks walk the whole state
 * on every dispatch: the ~5,400 schedule dispatches of a 360-team league take
 * ~7 s with them and ~0.25 s without, and they print slow-middleware warnings.
 * Keep the reducer map in sync with store/store.ts.
 */
export function createFastStore(): AppStore {
  return configureStore({
    reducer: {
      appState: appStateSlice.reducer,
      uiState: uiStateSlice.reducer,
      teamStats: teamStatsSlice.reducer,
      teamSchedule: teamScheduleSlice.reducer,
      regularSeasonRecords: regularSeasonRecordSlice.reducer,
      tournament: tournamentSlice.reducer,
      tournamentPlayersPicks: tournamentPlayersPicksSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }),
  }) as unknown as AppStore;
}
