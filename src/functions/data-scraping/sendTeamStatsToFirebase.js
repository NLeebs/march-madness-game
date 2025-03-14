// Database
import { doc, setDoc } from "firebase/firestore";
import db from "@/src/firebase/config.js";

// Team Statistics URLs
import {
  accStatURLs,
  americaEastStatURLs,
  americanAthleticStatURLs,
  asunStatURLs,
  atlantic10StatURLs,
  big12StatURLs,
  bigEastStatURLs,
  bigSkyStatURLs,
  bigSouthStatURLs,
  bigTenStatURLs,
  bigWestStatURLs,
  caaStatURLs,
  cusaStatURLs,
  horizonStatURLs,
  ivyStatURLs,
  maacStatURLs,
  macStatURLs,
  meacStatURLs,
  missouriValleyStatURLs,
  mountainWestStatURLs,
  necStatURLs,
  ohioValleyStatURLs,
  patriotStatURLs,
  secStatURLs,
  southernStatURLs,
  southlandStatURLs,
  summitStatURLs,
  sunBeltStatURLs,
  swacStatURLs,
  wacStatURLs,
  wccStatURLs,
} from "@/src/components/Add-To-Firebase/Team-Stats-URL-Objects";

////// Team Stats and Color handler //////
const pythonDataScrapeHandler = async (e) => {
  e.preventDefault();

  // Conference and Ref URLs Config Array
  const firstHalfConfURLsArr = [
    ["acc", accStatURLs],
    ["americaEast", americaEastStatURLs],
    ["americanAthletic", americanAthleticStatURLs],
    ["asun", asunStatURLs],
    ["atlantic10", atlantic10StatURLs],
    ["big12", big12StatURLs],
    ["bigEast", bigEastStatURLs],
    ["bigSky", bigSkyStatURLs],
    ["bigSouth", bigSouthStatURLs],
    ["bigTen", bigTenStatURLs],
    ["bigWest", bigWestStatURLs],
    ["caa", caaStatURLs],
    ["cusa", cusaStatURLs],
    ["horizon", horizonStatURLs],
    ["ivy", ivyStatURLs],
  ];
  const secondHalfConfURLsArr = [
    ["maac", maacStatURLs],
    ["mac", macStatURLs],
    ["meac", meacStatURLs],
    ["missouriValley", missouriValleyStatURLs],
    ["mountainWest", mountainWestStatURLs],
    ["nec", necStatURLs],
    ["ohioValley", ohioValleyStatURLs],
    ["patriot", patriotStatURLs],
    ["sec", secStatURLs],
    ["southern", southernStatURLs],
    ["southland", southlandStatURLs],
    ["summit", summitStatURLs],
    ["sunBelt", sunBeltStatURLs],
    ["swac", swacStatURLs],
    ["wac", wacStatURLs],
    ["wcc", wccStatURLs],
  ];

  // To test individual conferences for errors
  const testURLArr = [["wcc", wccStatURLs]];

  // Create team stats return object
  const teamStatsObj = {};
  testURLArr.forEach((teamArr) => {
    teamStatsObj[teamArr[0]] = {};
  });

  // Call Python Script for each Conference and populate team stats object
  await Promise.all(
    testURLArr.map(async (confData) => {
      try {
        const confRes = await fetch("http://127.0.0.1:5000/ncaa-stats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(confData[1]),
        });
        if (confRes.ok) {
          const postData = await confRes.json();
          postData.forEach((obj) => {
            teamStatsObj[confData[0]][Object.keys(obj)[0]] =
              obj[Object.keys(obj)[0]];
          });
        }
      } catch (err) {
        throw new Error(`${confData[0]} has errored out!`);
      }
    })
  );

  // Add item to database
  const currentYear = new Date().getFullYear();
  const statsRef = doc(db, "team-statistics", `${currentYear}`);
  await setDoc(statsRef, teamStatsObj, { merge: true });
};

export default pythonDataScrapeHandler;
