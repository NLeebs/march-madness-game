import { doc, getDoc, DocumentData } from "firebase/firestore";
import db from "@/src/firebase/config";
import { ConferenceMap } from "@/schemas";

export const getTeamStatData = async (): Promise<ConferenceMap | null> => {
  const dateObj = new Date();
  const currentYear = dateObj.getFullYear();

  try {
    const teamStatsRef = doc(db, "team-statistics", `${currentYear}`);
    const teamStatsSnapshot = await getDoc(teamStatsRef);

    if (teamStatsSnapshot.exists()) {
      const data = teamStatsSnapshot.data();
      return data as ConferenceMap;
    } else {
      console.log("Revert to prior year");

      const fallbackTeamStatsRef = doc(
        db,
        "team-statistics",
        `${currentYear - 1}`
      );
      const fallbackTeamStatsSnapshot = await getDoc(fallbackTeamStatsRef);

      if (fallbackTeamStatsSnapshot.exists()) {
        const fallbackData = fallbackTeamStatsSnapshot.data();
        return fallbackData as ConferenceMap;
      } else {
        console.log("Data can't be pulled from DB");
        return null;
      }
    }
  } catch (error) {
    console.error("Error fetching team statistics data:", error);
    return null;
  }
};
