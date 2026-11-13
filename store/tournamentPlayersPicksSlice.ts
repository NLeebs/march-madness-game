import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  TournamentPlayerPicks,
  Pick,
  PlayInGameWinner,
} from "@/types";
import {
  applyPick,
  replacePlayinPlaceholder,
} from "@/src/functions/tournament/picks";

const initalState: TournamentPlayerPicks =
  process.env.NEXT_PUBLIC_APP_MODE !== "dev"
    ? {
        picks: {
          roundTwoPicks: {
            west: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            east: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            south: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            midwest: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
          },
          roundSweetSixteenPicks: {
            west: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            east: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            south: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            midwest: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
          },
          roundEliteEightPicks: {
            west: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            east: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            south: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            midwest: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
          },
          roundFinalFourPicks: {
            eastWest: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            southMidwest: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
          },
          roundFinalsPicks: {
            championship: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
          },
          champion: {
            champion: [[{ team: "", seed: "" }]],
          },
        },
      }
    : {
        picks: {
          roundTwoPicks: {
            east: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "UCF", seed: "8" },
              ],
              [
                { team: "Missouri", seed: "5" },
                { team: "East Tennessee State", seed: "13" },
              ],
              [
                { team: "Indiana", seed: "6" },
                { team: "Texas", seed: "3" },
              ],
              [
                { team: "Michigan State", seed: "10" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            west: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "UCF", seed: "8" },
              ],
              [
                { team: "Missouri", seed: "5" },
                { team: "East Tennessee State", seed: "13" },
              ],
              [
                { team: "Indiana", seed: "6" },
                { team: "Texas", seed: "3" },
              ],
              [
                { team: "Michigan State", seed: "10" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            south: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "UCF", seed: "8" },
              ],
              [
                { team: "Missouri", seed: "5" },
                { team: "East Tennessee State", seed: "13" },
              ],
              [
                { team: "Indiana", seed: "6" },
                { team: "Texas", seed: "3" },
              ],
              [
                { team: "Michigan State", seed: "10" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            midwest: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "UCF", seed: "8" },
              ],
              [
                { team: "Missouri", seed: "5" },
                { team: "East Tennessee State", seed: "13" },
              ],
              [
                { team: "Indiana", seed: "6" },
                { team: "Texas", seed: "3" },
              ],
              [
                { team: "Michigan State", seed: "10" },
                { team: "UCLA", seed: "2" },
              ],
            ],
          },
          roundSweetSixteenPicks: {
            east: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Missouri", seed: "5" },
              ],
              [
                { team: "Texas", seed: "3" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            west: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Missouri", seed: "5" },
              ],
              [
                { team: "Texas", seed: "3" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            south: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Missouri", seed: "5" },
              ],
              [
                { team: "Texas", seed: "3" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            midwest: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Missouri", seed: "5" },
              ],
              [
                { team: "Texas", seed: "3" },
                { team: "UCLA", seed: "2" },
              ],
            ],
          },
          roundEliteEightPicks: {
            east: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Texas", seed: "3" },
              ],
            ],
            west: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Texas", seed: "3" },
              ],
            ],
            south: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Texas", seed: "3" },
              ],
            ],
            midwest: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Texas", seed: "3" },
              ],
            ],
          },
          roundFinalFourPicks: {
            eastWest: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Ohio State", seed: "1" },
              ],
            ],
            southMidwest: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Ohio State", seed: "1" },
              ],
            ],
          },
          roundFinalsPicks: {
            championship: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Ohio State", seed: "1" },
              ],
            ],
          },
          champion: {
            champion: [[{ team: "Ohio State", seed: "1" }]],
          },
        },
      };

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
