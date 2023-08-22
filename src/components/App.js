"use client"
// Libraries
import React, { Fragment } from "react";
// React Functions
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// State
import { teamStatsActions } from "@/store/teamStatsSlice";
import { teamScheduleActions } from "@/store/teamScheduleSlice";
//Functions
import getTeamStatData from "@/src/functions/teamStatsData/getTeamStatData";
// Components
import AddTeamStatsToFirebase from "@/src/components/Add-To-Firebase/AddTeamStatsToFirebase.js";
import StartButton from "@/src/components/UI/StartButton.js";
import SeasonSchedule from "./RegularSeason/SeasonSchedule";

function App() {
  const dispatch = useDispatch();
  const teamStatsObject = useSelector((state) => state.teamStats);
  const teamArray = useSelector((state) => state.teamSchedule.teamArray);

  // Add Team Stats to State and Config Schedules State
  useEffect(() => {
    getTeamStatData().then((teamStatsData) => {
      dispatch(teamStatsActions.addToStateFromDB(teamStatsData));
      dispatch(teamScheduleActions.teamScheduleConfig(teamStatsData))
      dispatch(teamScheduleActions.teamScheduleConfig(teamStatsData))
   
    });
  }, [dispatch]);
  
  return (
    <Fragment>
      <h1>Hello World!</h1>
      {/* <AddTeamStatsToFirebase /> */}
      {teamArray && <SeasonSchedule teamStats={teamStatsObject.teamStats} teamArray={teamArray} />}      
      <StartButton />
    </Fragment>
   
  );
}

export default App;