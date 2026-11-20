import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { appStateActions, regularSeasonRecordActions } from "@/store";
import { delay } from "@/src/functions";
import {
  AMOUNT_SEASON_GAMES,
  TIMER_PER_REGULAR_SEASON_GAME,
} from "@/src/constants";
import { RootState } from "@/store";
import { GameResult } from "@/types";

/**
 * Replays the server's season (regularSeasonRecords.season) with the old
 * driver's timing: every week's timer starts together, then each week's
 * results are dispatched in schedule order followed by that week's increment.
 * Waits (teams at 0-0) until the season arrives.
 */
export const PlayRegularSeasonGames: React.FC = () => {
  const dispatch = useDispatch();
  const [seasonPlayed, setSeasonPlayed] = useState<boolean>(false);

  const season = useSelector(
    (state: RootState) => state.regularSeasonRecords.season
  );
  const weeksPlayed = useSelector(
    (state: RootState) => state.regularSeasonRecords.weeksPlayed
  );

  const playRegularSeasonGames = useCallback(
    (weeks: GameResult[][]) => {
      if (seasonPlayed) return;

      weeks.forEach(async (results: GameResult[]) => {
        await Promise.all([delay(TIMER_PER_REGULAR_SEASON_GAME)])
          .then(() => {
            results.forEach((gameResult: GameResult) => {
              dispatch(
                regularSeasonRecordActions.addRegularSeasonGameResult(gameResult)
              );
            });
          })
          .catch((e: Error) => console.error(e));
        dispatch(regularSeasonRecordActions.addWeekPlayedToTotal());
        setSeasonPlayed(true);
      });
    },
    [seasonPlayed, dispatch]
  );

  useEffect(() => {
    if (!season) return;
    if (weeksPlayed === 0) playRegularSeasonGames(season.weeks);
    if (weeksPlayed === AMOUNT_SEASON_GAMES)
      dispatch(appStateActions.activateSelectionSunday());
  }, [dispatch, weeksPlayed, playRegularSeasonGames, season]);

  return null;
};

export default PlayRegularSeasonGames;
