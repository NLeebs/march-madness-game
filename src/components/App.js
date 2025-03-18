"use client";
import React from "react";
import { MotionConfig, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { appStateActions } from "@/store/appStateSlice";
import { uiStateActions } from "@/store/uiStateSlice";
import { teamStatsActions } from "@/store/teamStatsSlice";
import { teamScheduleActions } from "@/store/teamScheduleSlice";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
import getTeamStatData from "@/src/functions/teamStatsData/getTeamStatData";
import { AddTeamStatsToFirebase } from "@/src/components";
import StartScreen from "./UI/StartScreen";
import SeasonSchedule from "./RegularSeason/SeasonSchedule";
import RegularSeason from "./RegularSeason/RegularSeason";
import Tournament from "./Tournament/Tournament";
import PlayPlayinGames from "./Tournament/PlayPlayinGames";
import PlayTournamentGames from "./Tournament/PlayTournamentGames";
import TournamentRecapDialog from "./Tournament/TournamentRecapDialog";

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
        {appState.tournament && <Tournament appState={appState} />}
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
