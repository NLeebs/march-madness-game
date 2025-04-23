import { TournamentRound } from "@/types";
import { createSlice } from "@reduxjs/toolkit";

interface UiState {
  isRecapDialogOpen: boolean;
  selectedRound: TournamentRound;
  screenWidth?: number;
  screenHeight?: number;
}

const initalState: UiState = {
  isRecapDialogOpen: false,
  selectedRound: 1,
};

const uiStateSlice = createSlice({
  name: "uiState",
  initialState: initalState,
  reducers: {
    restartGame(state) {
      state.isRecapDialogOpen = false;
      state.selectedRound = 1;
    },
    screenSize(state, action) {
      state.screenWidth = action.payload.screenWidth;
      state.screenHeight = action.payload.screenHeight;
    },
    toggleRecapDialog(state) {
      state.isRecapDialogOpen = !state.isRecapDialogOpen;
    },
    selectRound(state, action) {
      state.selectedRound = action.payload.newRound;
    },
  },
});

export const uiStateActions = uiStateSlice.actions;
export default uiStateSlice;
