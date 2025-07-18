import { TeamStats } from "@/schemas";

export const totalNumberOfNCAATeams = function (teamStatsObj: TeamStats) {
  let numberOfTeams = 0;
  Object.keys(teamStatsObj).forEach((conf) => {
    numberOfTeams += Object.keys(teamStatsObj[conf]).length;
  });

  return numberOfTeams;
};
