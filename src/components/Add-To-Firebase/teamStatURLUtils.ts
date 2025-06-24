import { allStatURLsObjects } from "./Team-Stats-URL-Objects";
import { ConferenceStatsScraper } from "@/types/team-stats/ConferenceStatsScraper";

export const numberOfConferences: number = allStatURLsObjects.filter(
  (conferenceStatsObj: ConferenceStatsScraper) => {
    return (
      conferenceStatsObj &&
      typeof conferenceStatsObj === "object" &&
      Object.keys(conferenceStatsObj).length > 0
    );
  }
).length;
