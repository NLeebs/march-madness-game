"use client"

// Libraries
import React from "react";

// Database
import { doc, setDoc } from "firebase/firestore";
import db from "@/src/firebase/config.js";

// Team Statistics URLs
import big12StatsUrls from "./Team-Stats-URL-Objects/big12";
import bigTenStatsURLs from "./Team-Stats-URL-Objects/bigTen";



const pythonDataScrapeHandler = async (e) => {
  e.preventDefault();
  const teamStatsObj = {
    big12: {},
    bigTen: {},
  };

  // Big12 Python Call
  const big12Res = await fetch("http://127.0.0.1:5000/ncaa-stats", {
    method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(big12StatsUrls)
  });
  if (big12Res.ok) {
    const big12Data = await big12Res.json();
    big12Data.forEach(obj => {
      teamStatsObj.big12[Object.keys(obj)[0]] = obj[Object.keys(obj)[0]]
    });
  } else {
  alert(big12Res.statusText);
  }

  // BigTen Python Call
  const bigTenRes = await fetch("http://127.0.0.1:5000/ncaa-stats", {
    method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(bigTenStatsURLs)
  });
  if (bigTenRes.ok) {
    const bigTenData = await bigTenRes.json();
    bigTenData.forEach(obj => {
      teamStatsObj.bigTen[Object.keys(obj)[0]] = obj[Object.keys(obj)[0]]
    });
  } else {
  alert(bigTenRes.statusText);
  }

   // Add item to database
   const currentYear = new Date().getFullYear();
   const statsRef = doc(db, "team-statistics", `${currentYear}`);
   await setDoc(statsRef, teamStatsObj);
}

// Component Function
function AddTeamStatsToFirebase() {

  return (<button onClick={pythonDataScrapeHandler}>Add Team to FB</button>);
}

export default AddTeamStatsToFirebase;
