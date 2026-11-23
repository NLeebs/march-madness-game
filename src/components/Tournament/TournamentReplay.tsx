"use client";
import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { PlayPlayinGames } from "./PlayPlayinGames";
import { PlayTournamentGames } from "./PlayTournamentGames";

/**
 * Mounts the tournament replay drivers for the current phase: the play-in
 * games, then the rounds until the recap. Used by App and the game tests.
 */
export const TournamentReplay: React.FC = () => {
  const appState = useSelector((state: RootState) => state.appState);
  return (
    <>
      {appState.tournament && appState.tournamentPlayPlayinGames && (
        <PlayPlayinGames />
      )}
      {appState.tournament &&
        appState.tournamentPlayGames &&
        !appState.tournamentRecap && <PlayTournamentGames />}
    </>
  );
};
