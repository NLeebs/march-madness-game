// React Functions
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
// Functions
import playGame from "@/src/functions/playGame";
import delay from "@/src/functions/generic/delay";
// Constanst
import { AMOUNT_SEASON_GAMES, TIMER_PER_REGULAR_SEASON_GAME } from "@/constants/CONSTANTS";


function PlayRegularSeasonGames(props) {
    const dispatch = useDispatch();

    const teamSchedules = useSelector((state) => state.teamSchedule.teamSchedules);
    const weeksPlayed = useSelector((state) => state.regularSeasonRecords.weeksPlayed);
    const teamStats = props.teamStats;

    const playRegularSeasonGames = useCallback(() => {
        Object.keys(teamSchedules).forEach(async (week) => {
             await Promise.all([delay(TIMER_PER_REGULAR_SEASON_GAME * 1000)]).then(() => {
                teamSchedules[week].forEach((game) => {
                    const gameResult = playGame(teamStats[game[0].conference][game[0].team], teamStats[game[1].conference][game[1].team]);
                    dispatch(regularSeasonRecordActions.addRegularSeasonGameResult(gameResult));
                });
            }
            ).catch((e) => console.error(e));
            dispatch(regularSeasonRecordActions.addWeekPlayedtoTotal());
        });
    }, [dispatch, teamStats, teamSchedules]);

    useEffect(() => {
        if (!teamSchedules || !teamStats) return;
        if (weeksPlayed === 0) playRegularSeasonGames();
        if (weeksPlayed === AMOUNT_SEASON_GAMES) dispatch(appStateActions.activateSelectionSunday());
        console.log("Hello");
    }, [dispatch, weeksPlayed, playRegularSeasonGames, teamStats, teamSchedules]);

    return;
}

export default PlayRegularSeasonGames;