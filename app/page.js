"use client"

// Libraries
import React from "react";

// Functions
import { useState, useEffect } from "react";

// Database
import db from "@/src/firebase/config.js";
import { collection, getDoc, querySnapshot, query, onSnapshot } from "firebase/firestore";

// Components
import Image from "next/image";
import BracketRound from "@/src/components/Bracket/BracketRound.js";
import BracketLine from "@/src/components/Bracket/BracketLine.js";
import AddTeamStatsToFirebase from "@/src/components/Add-To-Firebase/AddTeamStatsToFirebase.js";

export default function Home() {
  const [teamStatistics, setTeamStatistics] = useState([]);
  
  useEffect(() => {
    const q = query(collection(db, "team-statistics"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let teamStatisticsArr = [];

      querySnapshot.forEach((doc) => {
        teamStatisticsArr.push({
          ...doc.data(), id: doc.id
        });
      });
      setTeamStatistics(teamStatisticsArr);
    });
  }, []);

  console.log(teamStatistics);
  
  return (
    <React.Fragment>
      <h1>Hello World!</h1>
      <AddTeamStatsToFirebase />
   </React.Fragment>
  );
}
