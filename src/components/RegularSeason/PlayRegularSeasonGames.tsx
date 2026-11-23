import { useEffect } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { appStateActions, regularSeasonRecordActions } from "@/store";
import {
  AMOUNT_SEASON_GAMES,
  SECONDS_PER_REGULAR_SEASON_WEEK,
} from "@/src/constants";
import type { RootState } from "@/store";

const WEEK_MS = SECONDS_PER_REGULAR_SEASON_WEEK * 1000;

/**
 * Replays the server's season (regularSeasonRecords.season) week by week:
 * week n of the replay is due n x SECONDS_PER_REGULAR_SEASON_WEEK after it
 * starts, and never before the previous week has been applied. Each week
 * dispatches its results (in schedule order) as one action, then
 * addWeekPlayedToTotal.
 * Starts from weeksPlayed, so a remount resumes; stops on unmount.
 * Waits (teams at 0-0) until the season arrives.
 */
export const PlayRegularSeasonGames: React.FC = () => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();

  const season = useSelector(
    (state: RootState) => state.regularSeasonRecords.season
  );
  const weeksPlayed = useSelector(
    (state: RootState) => state.regularSeasonRecords.weeksPlayed
  );

  useEffect(() => {
    if (!season) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = Date.now();
    const firstWeek = store.getState().regularSeasonRecords.weeksPlayed;

    const scheduleWeek = (week: number) => {
      if (week >= season.weeks.length) return;
      const due = start + (week - firstWeek + 1) * WEEK_MS;
      timer = setTimeout(() => {
        if (cancelled) return;
        dispatch(
          regularSeasonRecordActions.addRegularSeasonWeekResults(
            season.weeks[week]
          )
        );
        dispatch(regularSeasonRecordActions.addWeekPlayedToTotal());
        scheduleWeek(week + 1);
      }, Math.max(0, due - Date.now()));
    };
    scheduleWeek(firstWeek);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dispatch, store, season]);

  useEffect(() => {
    if (weeksPlayed === AMOUNT_SEASON_GAMES)
      dispatch(appStateActions.activateSelectionSunday());
  }, [dispatch, weeksPlayed]);

  return null;
};

export default PlayRegularSeasonGames;
