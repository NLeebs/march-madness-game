import { doc, getDoc } from "firebase/firestore";
import db from "@/src/firebase/config.js";

export const getTeamStatData = async () => {
  const dateObj = new Date();
  const currentYear = dateObj.getFullYear();

  const teamStatsRef = doc(db, "team-statistics", `${currentYear}`);
  const teamStatsSnaphot = await getDoc(teamStatsRef);

  if (teamStatsSnaphot.exists()) {
    return teamStatsSnaphot.data();
  } else {
    console.log("Revert to prior year");

    const fallbackTeamStatsRef = doc(
      db,
      "team-statistics",
      `${currentYear - 1}`
    );
    const fallbackTeamStatsSnapshot = await getDoc(fallbackTeamStatsRef);

    if (fallbackTeamStatsSnapshot.exists()) {
      return fallbackTeamStatsSnapshot.data();
    } else {
      console.log("Data can't be pulled from DB");
      return null;
    }
  }
};
