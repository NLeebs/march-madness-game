import { useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { teamScheduleActions } from "@/store";
import {
  AMOUNT_NONCONFERENCE_GAMES,
  AMOUNT_SEASON_GAMES,
} from "@/src/constants";
import { ConferenceMap } from "@/schemas";
import { TeamSchedule } from "@/types";

interface SeasonScheduleProps {
  teamStats: ConferenceMap;
  teamArray: TeamSchedule[];
}

export const SeasonSchedule: React.FC<SeasonScheduleProps> = ({
  teamStats,
  teamArray,
}) => {
  const dispatch = useDispatch();

  const randomTeamSchedule = useCallback(
    (arr: TeamSchedule[], weekNo: number) => {
      const loopedArr = arr;

      while (loopedArr.length >= 2) {
        // Get and remove team 1
        const indexTeam1 = Math.floor(Math.random() * loopedArr.length);
        const team1 = loopedArr.splice(indexTeam1, 1)[0];

        // Get and remove team 2
        const indexTeam2 = Math.floor(Math.random() * loopedArr.length);
        const team2 = loopedArr.splice(indexTeam2, 1)[0];

        dispatch(
          teamScheduleActions.addGameToTeamSchedule({
            weekNumber: `week${weekNo}`,
            matchup: [team1, team2],
          })
        );
      }

      if (loopedArr.length > 0) return loopedArr;
    },
    [dispatch]
  );

  const scheduleNonConferenceGames = useCallback(
    (teamArray: TeamSchedule[], weekNo: number) => {
      const allNCAATeamsArr = [...teamArray];
      randomTeamSchedule(allNCAATeamsArr, weekNo);
    },
    [randomTeamSchedule]
  );

  const scheduleConferenceGames = useCallback(
    (teamStats: ConferenceMap, teamArray: TeamSchedule[], weekNo: number) => {
      const leftoverTeamsArr = [];
      Object.keys(teamStats).forEach((conf) => {
        const confTeams = [];
        teamArray.forEach((team) => {
          if (conf === team.conference) {
            confTeams.push(team);
          }
        });
        const leftoverTeam = randomTeamSchedule(confTeams, weekNo);
        if (leftoverTeam) {
          leftoverTeamsArr.push(leftoverTeam[0]);
        }
      });
      randomTeamSchedule(leftoverTeamsArr, weekNo);
    },
    [randomTeamSchedule]
  );

  useEffect(() => {
    if (teamArray.length > 0) {
      for (let i = 1; i <= AMOUNT_NONCONFERENCE_GAMES; i++) {
        scheduleNonConferenceGames(teamArray, i);
      }
      for (
        let i = AMOUNT_NONCONFERENCE_GAMES + 1;
        i <= AMOUNT_SEASON_GAMES;
        i++
      ) {
        scheduleConferenceGames(teamStats, teamArray, i);
      }
    }
  }, [
    teamArray,
    teamStats,
    scheduleNonConferenceGames,
    scheduleConferenceGames,
  ]);

  return null;
};
