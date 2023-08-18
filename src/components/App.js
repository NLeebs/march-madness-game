"use client"
// Libraries
import React, { Fragment } from "react";
// React Functions
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
// State
import { teamStatsActions } from "@/store/teamStatsSlice";
//Functions
import getTeamStatData from "@/src/functions/teamStatsData/getTeamStatData";
import numberOfTeams from "../functions/teamStatsData/numberOfTeams";
// Components
import { Provider } from "react-redux";
import Image from "next/image";
import BracketRound from "@/src/components/Bracket/BracketRound.js";
import BracketLine from "@/src/components/Bracket/BracketLine.js";
import AddTeamStatsToFirebase from "@/src/components/Add-To-Firebase/AddTeamStatsToFirebase.js";
import StartButton from "@/src/components/UI/StartButton.js";

function App() {
  const dispatch = useDispatch();
  const teamStatsObject = useSelector((state) => state.teamStats)

  useEffect(() => {
    getTeamStatData().then((teamStatsData) => {
      dispatch(teamStatsActions.addToStateFromDB(teamStatsData))
    });
  }, [dispatch]);
  
  return (
    <Fragment>
      <h1>Hello World!</h1>
      <AddTeamStatsToFirebase />
      <StartButton />
    </Fragment>
   
  );
}

export default App;