import db from "@/src/firebase/config";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { ConferenceMap } from "@/models";

export class TeamStatsRepository {
  async getYears(): Promise<string[]> {
    const teamStatsCollection = collection(db, "team-statistics");
    const teamStatsSnapshot = await getDocs(teamStatsCollection);

    if (teamStatsSnapshot.empty) {
      throw new Error("Error fetching team statistics years from Firebase");
    }

    return teamStatsSnapshot.docs.map((doc) => doc.id);
  }

  async getTeamStatsByYearId(year: number): Promise<ConferenceMap> {
    const teamStatsRef = doc(db, "team-statistics", `${year}`);
    const teamStatsSnapshot = await getDoc(teamStatsRef);

    if (teamStatsSnapshot.exists()) {
      return teamStatsSnapshot.data() as ConferenceMap;
    } else {
      throw new Error(
        `Error fetching team statistics by year from Firebase: ${year}`
      );
    }
  }
}
