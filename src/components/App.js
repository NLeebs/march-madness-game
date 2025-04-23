"use client";
import React, { useEffect } from "react";
import { MotionConfig, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import {
  appStateActions,
  uiStateActions,
  teamStatsActions,
  teamScheduleActions,
  regularSeasonRecordActions,
} from "@/store";
import {
  AddTeamStatsToFirebase,
  PlayPlayinGames,
  StartScreen,
  Tournament,
  PlayTournamentGames,
  RegularSeason,
  SeasonSchedule,
  TournamentRecapDialog,
} from "@/src/components";
import { getTeamStatData } from "@/src/functions";

// TODO:
// 5. Multiple year stats
// 6. Slow down tourny playing
// 6. Stop lazy load of team icons in regular season
// 6. Authentication and user login
// 6. Login and API error validation
// 6. Select favorite team -> color changes
// 6. Favorite team stat boost
// 7. Send game data to database
// 8. User Dashboard with Statistics
// 9. Winner animations

function App() {
  const dispatch = useDispatch();

  const appState = useSelector((state) => state.appState);
  const teamStatsObject = useSelector((state) => state.teamStats);
  const teamArray = useSelector((state) => state.teamSchedule.teamArray);
  const teamScheduleObj = useSelector((state) => state.teamSchedule);

  // Monitor resizing of the screen
  useEffect(() => {
    function handleResize() {
      const screenSizeObj = {
        screenWidth: window.innerWidth,
        screenHeigth: window.innerHeight,
      };
      dispatch(uiStateActions.screenSize(screenSizeObj));
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [dispatch]);

  // Add Team Stats to State and Config Schedules State
  useEffect(() => {
    getTeamStatData().then((teamStatsData) => {
      dispatch(teamStatsActions.addToStateFromDB(teamStatsData));
      dispatch(teamStatsActions.addConferenceArrays(teamStatsData));
      dispatch(teamScheduleActions.teamScheduleConfig(teamStatsData));
      dispatch(
        regularSeasonRecordActions.regularSeasonRecordConfig(teamStatsData)
      );
    });
  }, [dispatch]);

  // Turn off loading app state once TeamStats populated
  useEffect(() => {
    if (teamScheduleObj.teamArray.length > 0)
      dispatch(appStateActions.loadingComplete());
  }, [dispatch, teamScheduleObj.teamArray.length]);

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
    </MotionConfig>
  );
}

export default App;
