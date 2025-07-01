import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { appStateActions, regularSeasonRecordActions } from "@/store";
import { delay, playGame } from "@/src/functions";
import {
  AMOUNT_SEASON_GAMES,
  TIMER_PER_REGULAR_SEASON_GAME,
} from "@/src/constants";
import { RootState } from "@/store";
import { ConferenceMap } from "@/schemas";

interface PlayRegularSeasonGamesProps {
  teamStats: ConferenceMap;
}

interface TeamSchedule {
  team: string;
  conference: string;
}

interface TeamSchedules {
  [week: string]: TeamSchedule[][];
}

export const PlayRegularSeasonGames: React.FC<PlayRegularSeasonGamesProps> = (
  props
) => {
  const dispatch = useDispatch();
  const [seasonPlayed, setSeasonPlayed] = useState<boolean>(false);

  const teamSchedules = useSelector(
    (state: RootState) => state.teamSchedule.teamSchedules
  ) as TeamSchedules;
  const weeksPlayed = useSelector(
    (state: RootState) => state.regularSeasonRecords.weeksPlayed
  );
  const teamStats = props.teamStats;

  const playRegularSeasonGames = useCallback(() => {
    if (seasonPlayed) return;

    Object.keys(teamSchedules).forEach(async (week: string) => {
      await Promise.all([delay(TIMER_PER_REGULAR_SEASON_GAME)])
        .then(() => {
          teamSchedules[week].forEach((game: TeamSchedule[]) => {
            const gameResult = playGame(
              teamStats[game[0].conference][game[0].team],
              teamStats[game[1].conference][game[1].team]
            );
            dispatch(
              regularSeasonRecordActions.addRegularSeasonGameResult(gameResult)
            );
          });
        })
        .catch((e: Error) => console.error(e));
      dispatch(regularSeasonRecordActions.addWeekPlayedToTotal());
      setSeasonPlayed(true);
    });
  }, [seasonPlayed, teamSchedules, teamStats, dispatch]);

  useEffect(() => {
    if (!teamSchedules || !teamStats) return;
    if (weeksPlayed === 0) playRegularSeasonGames();
    if (weeksPlayed === AMOUNT_SEASON_GAMES)
      dispatch(appStateActions.activateSelectionSunday());
  }, [dispatch, weeksPlayed, playRegularSeasonGames, teamStats, teamSchedules]);

  return null;
};

export default PlayRegularSeasonGames;
