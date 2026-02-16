"use client";
import React, { useEffect } from "react";
import { MotionConfig, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { uiStateActions, RootState } from "@/store";
import {
  AddTeamStatsToFirebase,
  PlayPlayinGames,
  StartScreen,
  Tournament,
  PlayTournamentGames,
  RegularSeason,
  SeasonSchedule,
  TournamentRecapDialog,
  TournamentPersist,
} from "@/src/components";

// 8. User Dashboard with Statistics
// 6. Slow down tourny playing
// 6. Select favorite team -> color changes
// 9. Winner animations

function App() {
  const dispatch = useDispatch();

  const appState = useSelector((state: RootState) => state.appState);
  const teamStatsObject = useSelector((state: RootState) => state.teamStats);
  const teamArray = useSelector(
    (state: RootState) => state.teamSchedule.teamArray,
  );

  useEffect(() => {
    function handleResize() {
      const screenSizeObj = {
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      };
      dispatch(uiStateActions.screenSize(screenSizeObj));
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [dispatch]);

  return (
    <MotionConfig reducedMotion="user">
      {/* <AddTeamStatsToFirebase /> */}

      {teamArray && (
        <SeasonSchedule
          teamStats={teamStatsObject.teamStats}
          teamArray={teamArray}
        />
      )}
      {appState.startScreen && <StartScreen />}
      <AnimatePresence>
        {appState.regularSeason && (
          <RegularSeason teamStats={teamStatsObject.teamStats} />
        )}
        {appState.tournament && <Tournament />}
      </AnimatePresence>
      {appState.tournament && appState.tournamentPlayPlayinGames && (
        <PlayPlayinGames />
      )}
      {appState.tournament &&
        appState.tournamentPlayGames &&
        !appState.tournamentRecap && <PlayTournamentGames />}
      {appState.tournamentRecap && <TournamentRecapDialog />}
      {appState.tournamentRecap && <TournamentPersist />}
    </MotionConfig>
  );
}

export default App;
