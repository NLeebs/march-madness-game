"use client"
// Libraries
import React, { Fragment } from "react";
// React Functions
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// State
import { teamStatsActions } from "@/store/teamStatsSlice";
import { teamScheduleActions } from "@/store/teamScheduleSlice";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
//Functions
import getTeamStatData from "@/src/functions/teamStatsData/getTeamStatData";
// Components
import AddTeamStatsToFirebase from "@/src/components/Add-To-Firebase/AddTeamStatsToFirebase.js";
import StartButton from "@/src/components/UI/StartButton.js";
import SeasonSchedule from "./RegularSeason/SeasonSchedule";
import RegularSeason from "./RegularSeason/RegularSeason";

function App() {
  const dispatch = useDispatch();
  const appState = useSelector((state) => state.appState);
  const teamStatsObject = useSelector((state) => state.teamStats);
  const teamArray = useSelector((state) => state.teamSchedule.teamArray);
  // console.log(teamArray);

  // Add Team Stats to State and Config Schedules State
  useEffect(() => {
    getTeamStatData().then((teamStatsData) => {
      dispatch(teamStatsActions.addToStateFromDB(teamStatsData));
      dispatch(teamStatsActions.addConferenceArrays(teamStatsData));
      dispatch(teamScheduleActions.teamScheduleConfig(teamStatsData));
      dispatch(regularSeasonRecordActions.regularSeasonRecordConfig(teamStatsData)); //
    });
  }, [dispatch]);
  
  return (
    <Fragment>
      <h1>Hello World!</h1>
      {/* <AddTeamStatsToFirebase /> */}
      {teamArray && <SeasonSchedule teamStats={teamStatsObject.teamStats} teamArray={teamArray} />}      
      <StartButton />
      {appState.regularSeason && <RegularSeason teamStats={teamStatsObject.teamStats} />}
    </Fragment>
   
  );
}

export default App;