import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  TournamentPlayerPicks,
  Pick,
  PlayInGameWinner,
} from "@/types";
import { emptyPicks } from "@/src/functions/tournament/emptyState";
import {
  applyPick,
  replacePlayinPlaceholder,
} from "@/src/functions/tournament/picks";

/** Picks start empty; the server refuses picks that do not follow from the field. */
const initalState: TournamentPlayerPicks = { picks: emptyPicks() };

const tournamentPlayersPicksSlice = createSlice({
  name: "tournamentPlayersPicks",
  initialState: initalState,
  reducers: {
    restartGame: () => initalState,
    setPick(state, action: PayloadAction<Pick>) {
      state.picks = applyPick(state.picks, action.payload);
    },
    replacePlayinPicksWithWinner(
      state,
      action: PayloadAction<PlayInGameWinner>
    ) {
      state.picks = replacePlayinPlaceholder(state.picks, action.payload);
    },
  },
});

export const tournamentPlayersPicksActions =
  tournamentPlayersPicksSlice.actions;
export default tournamentPlayersPicksSlice;
