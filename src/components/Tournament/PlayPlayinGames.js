// React Functions
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
// Functions
import findTeamConference from "@/src/functions/teamStatsData/findTeamConference";
import playGame from "@/src/functions/playGame";
// State
import { tournamentActions } from "@/store/tournamentSlice";

function PlayPlayinGames(props) {
    const dispatch = useDispatch();

    const teamStats = useSelector((state) => state.teamStats.teamStats);
    const confArrs = useSelector((state) => state.teamStats.conferenceArrays);
    const RoundOneMatchups = useSelector((state) => state.tournament.roundOneMatchups);
    const playinMatchups = useSelector((state) => state.tournament.roundOneMatchups.playin);
    console.log(RoundOneMatchups);
    console.log(playinMatchups);

    useEffect(() => {
        Object.keys(playinMatchups).forEach((seeds) => {
            playinMatchups[seeds].forEach((matchup, i) => {
                const gameResults = playGame(teamStats[findTeamConference(matchup[0].team, confArrs)][matchup[0].team], teamStats[findTeamConference(matchup[1].team, confArrs)][matchup[1].team])
                console.log(gameResults, i);
                let winningTeam;
                if (gameResults.favoredScore > gameResults.underdogScore) winningTeam = gameResults.favoredTeam;
                else winningTeam = gameResults.underdogTeam
                dispatch(tournamentActions.setPlayinGameResults({seedType: seeds, gameIndex: i, winningTeam: winningTeam,}))
            });
        });
    }, [dispatch, playinMatchups, teamStats, confArrs]);


    return;
}

export default PlayPlayinGames;