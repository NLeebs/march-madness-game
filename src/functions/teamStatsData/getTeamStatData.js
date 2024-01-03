import { doc, getDoc } from "firebase/firestore";
import db from "@/src/firebase/config.js";

const getTeamStatData = async () => {
    const dateObj = new Date();
    const currentMonth = dateObj.getMonth();
    const currentYear = dateObj.getFullYear();

    const teamStatsRef = doc(db, "team-statistics", `${currentMonth >= 5 ? currentYear : currentYear - 1}`);
    const teamStatsSnaphot = await getDoc(teamStatsRef);

    if (teamStatsSnaphot.exists()) {
        return teamStatsSnaphot.data();
    } else {
        console.log('Doc does not exist!');
        return null;
    }
}

export default getTeamStatData;