import db from "@/src/firebase/config";
import { collection, getDocs } from "firebase/firestore";

export class TeamStatsRepository {
  async getYears(): Promise<string[]> {
    const teamStatsCollection = collection(db, "team-statistics");
    const teamStatsSnapshot = await getDocs(teamStatsCollection);

    if (teamStatsSnapshot.empty) {
      throw new Error("Error fetching team statistics years from Firebase");
    }

    return teamStatsSnapshot.docs.map((doc) => doc.id);
  }
}
