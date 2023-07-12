"use client"

// Libraries
import React from "react";

// Functions
import { useEffect } from "react";

// Database
import { doc, setDoc } from "firebase/firestore";
import db from "@/src/firebase/config.js";

// Team Statistics
import macStatistics from "./Team-Statistics-Objects-2023/mac.js";
import mountainWestStatistics from "./Team-Statistics-Objects-2023/mountainWest.js";
import secStatistics from "./Team-Statistics-Objects-2023/sec.js";
import swacStatistics from "./Team-Statistics-Objects-2023/swac.js";
import wacStatistics from "./Team-Statistics-Objects-2023/wac.js";

/// Create Team Statistics Objects ///
const TEAM_STATISTICS_OBJECT = {
  "mac": macStatistics, 
  "mountain-west": mountainWestStatistics, 
  "sec": secStatistics, 
  "swac": swacStatistics, 
  "wac": wacStatistics,
};

// console.log(TEAM_STATISTICS_OBJECT);

// Add item to database
const addTeamStatsHandler = async (e) => {
  e.preventDefault();
  const currentYear = new Date().getFullYear();
  const statsRef = doc(db, "team-statistics", `${currentYear}`);
  await setDoc(statsRef, TEAM_STATISTICS_OBJECT);
}
// Read items from database

// Delete item from database

function AddTeamStatsToFirebase() {

  return (<button onClick={addTeamStatsHandler}>Add Team to FB</button>);
}

export default AddTeamStatsToFirebase;
