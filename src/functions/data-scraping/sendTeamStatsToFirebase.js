// Database
import { doc, setDoc } from "firebase/firestore";
import db from "@/src/firebase/config.js";

// Team Statistics URLs
import americaAthleticStatURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/americanAthletic";
import americaEastStatURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/americaEast";
import accStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/acc";
import big12StatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/big12";
import bigTenStatsURLs from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects/bigTen";

////// Team Stats and Color handler //////
const pythonDataScrapeHandler = async (e) => {
    e.preventDefault();

    // Conference and Ref URLs Config Array
    const confURLsArr = [['acc', accStatsURLs], ['americanAthletic', americaAthleticStatURLs],['americanEast', americaEastStatURLs], ['big12', big12StatsURLs], ['bigTen', bigTenStatsURLs]];

    // Create team stats return object
    const teamStatsObj = {};
    confURLsArr.forEach(teamArr => {
        teamStatsObj[teamArr[0]] = {};
    });

    // Call Python Script for each Conference and populate team stats object
    await Promise.all(confURLsArr.map( async confData => {
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
            alert(confRes.statusText);
        }
    }));

   // Add item to database
   const currentYear = new Date().getFullYear();
   const statsRef = doc(db, "team-statistics", `${currentYear}`);
   await setDoc(statsRef, teamStatsObj, { merge: true });
}

export default pythonDataScrapeHandler;