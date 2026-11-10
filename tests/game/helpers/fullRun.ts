import React from "react";
import type { AnyAction } from "@reduxjs/toolkit";
import { appStateActions } from "@/store";
import { SelectionSunday } from "@/src/components/RegularSeason/SelectionSunday";
import type { AppStore } from "@/store";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import type { League } from "@/tests/factories";
import { createFastStore } from "./fastStore";
import { recordActions, renderWithStore } from "./renderWithStore";
import { seedMathRandom } from "./rng";
import { playSeason, playTournament } from "./runGame";

export interface FullRun {
  league: League;
  store: AppStore;
  actions: AnyAction[];
  /** appState flags in the order they became true (false -> true), season start to recap. */
  flagSequence: string[];
  /** Total Math.random calls over the whole run. */
  draws: number;
}

/**
 * One whole game on a fresh fast store with a single seeded Math.random stream:
 * configure -> activateRegularSeason -> playSeason -> render SelectionSunday ->
 * playTournament (chalk picks). Fake timers are switched on by playSeason; the
 * caller restores real timers and calls cleanup(). Math.random is restored here.
 */
export async function playFullGame(seed: number): Promise<FullRun> {
  const league = buildLeague();
  const { middleware, actions } = recordActions();
  const store = createFastStore({ extraMiddleware: [middleware] });
  configureStoreForLeague(store, league);

  const flagSequence: string[] = [];
  let previous = { ...store.getState().appState } as Record<string, boolean>;
  const unsubscribe = store.subscribe(() => {
    const next = { ...store.getState().appState } as Record<string, boolean>;
    for (const key of Object.keys(next)) if (next[key] && !previous[key]) flagSequence.push(key);
    previous = next;
  });

  const seeded = seedMathRandom(seed);
  let draws = 0;
  try {
    store.dispatch(appStateActions.activateRegularSeason());
    await playSeason(store, league);
    renderWithStore(React.createElement(SelectionSunday), store);
    await playTournament(store);
    draws = seeded.calls();
  } finally {
    seeded.restore();
    unsubscribe();
  }
  return { league, store, actions, flagSequence, draws };
}
