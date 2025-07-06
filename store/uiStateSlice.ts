import { TournamentRound } from "@/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ScreenSizePayload {
  screenWidth: number;
  screenHeight: number;
}

interface SelectRoundPayload {
  newRound: TournamentRound;
}

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
    screenSize(state, action: PayloadAction<ScreenSizePayload>) {
      state.screenWidth = action.payload.screenWidth;
      state.screenHeight = action.payload.screenHeight;
    },
    toggleRecapDialog(state) {
      state.isRecapDialogOpen = !state.isRecapDialogOpen;
    },
    selectRound(state, action: PayloadAction<SelectRoundPayload>) {
      state.selectedRound = action.payload.newRound;
    },
  },
});

export const uiStateActions = uiStateSlice.actions;
export default uiStateSlice;
