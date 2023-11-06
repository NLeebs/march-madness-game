"use client"
// Libraries
import React, { Fragment } from "react";
// React Functions
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
import { teamStatsActions } from "@/store/teamStatsSlice";
import { teamScheduleActions } from "@/store/teamScheduleSlice";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
//Functions
import getTeamStatData from "@/src/functions/teamStatsData/getTeamStatData";
// Components
import AddTeamStatsToFirebase from "@/src/components/Add-To-Firebase/AddTeamStatsToFirebase.js";
import StartScreen from "./UI/StartScreen";
import SeasonSchedule from "./RegularSeason/SeasonSchedule";
import RegularSeason from "./RegularSeason/RegularSeason";
import Tournament from "./Tournament/Tournament";
import PlayPlayinGames from "./Tournament/PlayPlayinGames";
import PlayTournamentGames from "./Tournament/PlayTournamentGames";


function App() {
  const dispatch = useDispatch();
  const appState = useSelector((state) => state.appState);
  const teamStatsObject = useSelector((state) => state.teamStats);
  const teamArray = useSelector((state) => state.teamSchedule.teamArray);
  const teamScheduleObj = useSelector((state) => state.teamSchedule);

  // Add Team Stats to State and Config Schedules State
  useEffect(() => {
    getTeamStatData().then((teamStatsData) => {
      dispatch(teamStatsActions.addToStateFromDB(teamStatsData));
      dispatch(teamStatsActions.addConferenceArrays(teamStatsData));
      dispatch(teamScheduleActions.teamScheduleConfig(teamStatsData));
      dispatch(regularSeasonRecordActions.regularSeasonRecordConfig(teamStatsData)); //
    });
  }, [dispatch]);

  // Turn off loading app state once TeamStats populated
  useEffect(() => {
    if (teamScheduleObj.teamArray.length > 0) dispatch(appStateActions.loadingComplete()); 
  }, [dispatch, teamScheduleObj.teamArray.length]);
  
  return (
    <Fragment>
      {/* <AddTeamStatsToFirebase /> */}
      {teamArray && <SeasonSchedule teamStats={teamStatsObject.teamStats} teamArray={teamArray} />}      
      {appState.startScreen && <StartScreen />}
      {appState.regularSeason && <RegularSeason teamStats={teamStatsObject.teamStats} />}
      {appState.tournament && <Tournament appState={appState} />}
      {appState.tournament && appState.tournamentPlayPlayinGames && <PlayPlayinGames />}
      {appState.tournament && appState.tournamentPlayGames && !appState.tournamentRecap && <PlayTournamentGames />}
    </Fragment>
  );
}

export default App;