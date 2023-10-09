// React Functions
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// Functions
import findTeamConference from "@/src/functions/teamStatsData/findTeamConference";
import playGame from "@/src/functions/playGame";
// State
import { appStateActions } from "@/store/appStateSlice";
import { tournamentActions } from "@/store/tournamentSlice";

function PlayPlayinGames() {
    const dispatch = useDispatch();

    const teamStats = useSelector((state) => state.teamStats.teamStats);
    const confArrs = useSelector((state) => state.teamStats.conferenceArrays);
    const RoundOneMatchups = useSelector((state) => state.tournament.roundOneMatchups);
    const playinMatchups = useSelector((state) => state.tournament.roundOneMatchups.playin);
    console.log(playinMatchups);

    useEffect(() => {
        Object.keys(playinMatchups).forEach((seeds) => {
            playinMatchups[seeds].forEach((matchup, i) => {
                const gameResults = playGame(teamStats[findTeamConference(matchup[0].team, confArrs)][matchup[0].team], teamStats[findTeamConference(matchup[1].team, confArrs)][matchup[1].team])
                console.log(gameResults, i);
                let winningTeam;
                let winningScore;
                let losingScore;
                if (gameResults.favoredScore > gameResults.underdogScore) {
                    winningTeam = gameResults.favoredTeam; 
                    winningScore = gameResults.favoredScore;
                    losingScore = gameResults.underdogScore;
                }
                else {
                    winningTeam = gameResults.underdogTeam;
                    winningScore = gameResults.underdogScore;
                    losingScore = gameResults.favoredScore;
                }
                dispatch(tournamentActions.setPlayinGameResults({seedType: seeds, gameIndex: i, winningTeam, winningScore, losingScore}))
            });
        });
        dispatch(appStateActions.activateTournamentStandardGames());
    }, [dispatch, playinMatchups, teamStats, confArrs]);


    return;
}

export default PlayPlayinGames;