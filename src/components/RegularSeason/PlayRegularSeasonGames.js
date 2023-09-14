// React Functions
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
// Functions
import playGame from "@/src/functions/playGame";
// Constanst
import { AMOUNT_NONCONFERENCE_GAMES, AMOUNT_CONFERENCE_GAMES, AMOUNT_SEASON_GAMES } from "@/constants/CONSTANTS";


function PlayRegularSeasonGames(props) {
    const dispatch = useDispatch();

    const teamSchedules = useSelector((state) => state.teamSchedule.teamSchedules);
    const teamStats = props.teamStats;

    const playRegularSeasonGames = useCallback(() => {
        Object.keys(teamSchedules).forEach((week) => {
            teamSchedules[week].forEach((game) => {
                const gameResult = playGame(teamStats[game[0].conference][game[0].team], teamStats[game[1].conference][game[1].team]);
                dispatch(regularSeasonRecordActions.addRegularSeasonGameResult(gameResult));
            });
        });
    }, [dispatch, teamStats, teamSchedules]);

    useEffect(() => {
        if (!teamSchedules || !teamStats) return;
        playRegularSeasonGames();
        dispatch(appStateActions.activateSelectionSunday());
    }, [dispatch, playRegularSeasonGames, teamStats, teamSchedules]);

    return;
}

export default PlayRegularSeasonGames;