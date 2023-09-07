// React Functions
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
// State
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
// Functions
import playGame from "@/src/functions/playGame";
// Constanst
import { AMOUNT_NONCONFERENCE_GAMES, AMOUNT_CONFERENCE_GAMES, AMOUNT_SEASON_GAMES } from "@/constants/CONSTANTS";


function PlayRegularSeasonGames(props) {
    const teamSchedules = useSelector((state) => state.teamSchedule.teamSchedules);
    const teamStats = props.teamStats;
    
    const dispatch = useDispatch();

    const playRegularSeasonGames = useCallback(() => {
        const gameResults = playGame(teamStats[teamSchedules.week1[0][0].conference][teamSchedules.week1[0][0].team], teamStats[teamSchedules.week1[0][1].conference][teamSchedules.week1[0][1].team]);
        console.log(gameResults);
    }, [teamStats, teamSchedules]);

    useEffect(() => {
        if (!teamSchedules || !teamStats) return;
        playRegularSeasonGames();
    }, [playRegularSeasonGames, teamStats, teamSchedules]);

    return;
}

export default PlayRegularSeasonGames;