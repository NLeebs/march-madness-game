import { doc, getDoc } from "firebase/firestore";
import db from "@/src/firebase/config.js";

const getTeamStatData = async () => {
    const currentYear = new Date().getFullYear();
    const teamStatsRef = doc(db, "team-statistics", `${currentYear}`);
    const teamStatsSnaphot = await getDoc(teamStatsRef);

    if (teamStatsSnaphot.exists()) {
        return teamStatsSnaphot.data();
    } else {
        console.log('Doc does not exist!');
        return null;
    }
}

export default getTeamStatData;