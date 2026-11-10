import { configureStore, Middleware } from "@reduxjs/toolkit";
import teamStatsSlice from "./teamStatsSlice";
import teamScheduleSlice from "./teamScheduleSlice";
import appStateSlice from "./appStateSlice";
import uiStateSlice from "./uiStateSlice";
import regularSeasonRecordSlice from "./regularSeasonRecordSlice";
import tournamentSlice from "./tournamentSlice";
import tournamentPlayersPicksSlice from "./tournamentPlayersPicksSlice";

const reducer = {
  appState: appStateSlice.reducer,
  uiState: uiStateSlice.reducer,
  teamStats: teamStatsSlice.reducer,
  teamSchedule: teamScheduleSlice.reducer,
  regularSeasonRecords: regularSeasonRecordSlice.reducer,
  tournament: tournamentSlice.reducer,
  tournamentPlayersPicks: tournamentPlayersPicksSlice.reducer,
};

type BaseState = {
  [K in keyof typeof reducer]: ReturnType<(typeof reducer)[K]>;
};

export interface CreateAppStoreOptions {
  preloadedState?: Partial<BaseState>;
  extraMiddleware?: Middleware[];
  /** Redux Toolkit dev-only immutability/serializability checks. Default true. */
  devChecks?: boolean;
}

export function createAppStore(options: CreateAppStoreOptions = {}) {
  const { preloadedState, extraMiddleware = [], devChecks = true } = options;
  return configureStore({
    reducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      (devChecks
        ? getDefaultMiddleware()
        : getDefaultMiddleware({
            immutableCheck: false,
            serializableCheck: false,
          })
      ).concat(extraMiddleware),
  });
}

const store = createAppStore();

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<typeof store.getState>;
export default store;
