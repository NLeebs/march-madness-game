import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { teamScheduleActions } from "@/store";
import { createSeasonSchedule } from "@/src/functions";
import { ConferenceMap } from "@/models";
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

  useEffect(() => {
    if (teamArray.length > 0) {
      createSeasonSchedule(teamStats, teamArray).forEach(
        ({ weekNumber, matchup }) => {
          dispatch(
            teamScheduleActions.addGameToTeamSchedule({ weekNumber, matchup })
          );
        }
      );
    }
  }, [teamArray, teamStats, dispatch]);

  return null;
};
