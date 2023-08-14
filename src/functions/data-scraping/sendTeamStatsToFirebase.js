// Database
import { doc, setDoc } from "firebase/firestore";
import db from "@/src/firebase/config.js";

// Team Statistics URLs
import americaAthleticStatURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/americanAthletic";
import americaEastStatURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/americaEast";
import asunStatURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/asun";
import atlantic10StatURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/atlantic10";
import accStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/acc";
import big12StatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/big12";
import bigEastStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/bigEast";
import bigSkyStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/bigSky";
import bigSouthStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/bigSouth";
import bigTenStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/bigTen";
import bigWestStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/bigWest";
import caaStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/caa";
import cusaStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/cusa";
import horizonStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/horizon";
import ivyStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/ivy";

////// Team Stats and Color handler //////
const pythonDataScrapeHandler = async (e) => {
    e.preventDefault();

    // Conference and Ref URLs Config Array
    const confURLsArr = [
        ['acc', accStatsURLs], ['americanAthletic', americaAthleticStatURLs], ['americanEast', americaEastStatURLs], ['asun', asunStatURLs], 
        ['atlantic10', atlantic10StatURLs], ['big12', big12StatsURLs], ['bigEast', bigEastStatsURLs], ['bigSky', bigSkyStatsURLs], ['bigSouth', bigSouthStatsURLs], 
        ['bigTen', bigTenStatsURLs], ['bigWest', bigWestStatsURLs], ['caa', caaStatsURLs], ['cusa', cusaStatsURLs], ['horizon', horizonStatsURLs], 
        ['ivy', ivyStatsURLs],
    ];

    const testURLArr=[['ivy', ivyStatsURLs]];

    // Create team stats return object
    const teamStatsObj = {};
    testURLArr.forEach(teamArr => {
        teamStatsObj[teamArr[0]] = {};
    });

    // Call Python Script for each Conference and populate team stats object
    await Promise.all(testURLArr.map( async confData => {
        const confRes = await fetch("http://127.0.0.1:5000/ncaa-stats", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(confData[1])
        });
        if (confRes.ok) {
            const postData = await confRes.json();
            postData.forEach(obj => {
                teamStatsObj[confData[0]][Object.keys(obj)[0]] = obj[Object.keys(obj)[0]]
            });
        } else {
            console.log(`${confData[0]} has errored out`);
        }
    }));

   // Add item to database
   const currentYear = new Date().getFullYear();
   const statsRef = doc(db, "team-statistics", `${currentYear}`);
   await setDoc(statsRef, teamStatsObj, { merge: true });
}

export default pythonDataScrapeHandler;