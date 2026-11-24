import React from "react";
import { SelectionSunday } from "@/src/components/RegularSeason/SelectionSunday";
import { selectTournamentField } from "@/src/functions/regularSeason/selectTournamentField";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import { createFastStore } from "./fastStore";
import { recordActions, renderWithStore } from "./renderWithStore";
import { buildRecords } from "./runGame";

const league = buildLeague();
const champions = Object.keys(league.conferenceArrays).map((c) => league.conferenceArrays[c][0]);

/**
 * A store with a tournament field and no played season: hand-built records, then
 * Selection Sunday on their selection. `variant` shuffles the records' scores.
 */
export function fieldStore(variant: number) {
  const records = buildRecords(league, (team, i) => ({
    wins: champions.includes(team) ? 20 : 10,
    // distinct scores (37 is coprime to 360), shuffled per variant
    score: 1000 - ((i * 37 + variant * 11) % 360),
  }));
  const seedStore = createFastStore();
  configureStoreForLeague(seedStore, league);
  const base = seedStore.getState();
  const { middleware, actions } = recordActions();
  const store = createFastStore({
    extraMiddleware: [middleware],
    preloadedState: {
      ...base,
      regularSeasonRecords: {
        weeksPlayed: 30,
        records,
        season: { weeks: [], selection: selectTournamentField(records, league.conferenceArrays) },
      },
      appState: { ...base.appState, selectionSunday: true },
    },
  });
  const view = renderWithStore(<SelectionSunday />, store);
  view.unmount();
  return { store, actions };
}
