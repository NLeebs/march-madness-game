"use client"

// Libraries
import React from "react";

// Functions
import { useEffect } from "react";

// Database
import { doc, setDoc } from "firebase/firestore";
import db from "@/src/firebase/config.js";

// Team Statistics
import americaEastStatistics from "./Team-Statistics-Objects/americaEast.js";
import asunStatistics from "./Team-Statistics-Objects/asun.js";
import big12Statistics from "./Team-Statistics-Objects/big12.js";
import macStatistics from "./Team-Statistics-Objects/mac.js";
import mountainWestStatistics from "./Team-Statistics-Objects/mountainWest.js";
import pac12tStatistics from "./Team-Statistics-Objects/pac12.js";
import patriotStatistics from "./Team-Statistics-Objects/patriot.js";
import secStatistics from "./Team-Statistics-Objects/sec.js";
import sunBeltStatistics from "./Team-Statistics-Objects/sunBelt.js";
import swacStatistics from "./Team-Statistics-Objects/swac.js";
import wacStatistics from "./Team-Statistics-Objects/wac.js";

/// Create Team Statistics Objects ///
const TEAM_STATISTICS_OBJECT = {
  "americanEast": americaEastStatistics, 
  "asun": asunStatistics, 
  "big12": big12Statistics, 
  "mac": macStatistics, 
  "mountainWest": mountainWestStatistics, 
  "pac12": pac12tStatistics, 
  "patriot": patriotStatistics, 
  "sec": secStatistics, 
  "sunBelt": sunBeltStatistics, 
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
