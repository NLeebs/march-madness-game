// React Functions
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
// Functions
import getTournamentGameResultObj from "@/src/functions/tournament/getTournamentGameResultObj";
import findTeamConference from "@/src/functions/teamStatsData/findTeamConference";
import playGame from "@/src/functions/playGame";
// State
import { appStateActions } from "@/store/appStateSlice";
import { tournamentActions } from "@/store/tournamentSlice";

function PlayStandardGames(props) {
    const dispatch = useDispatch();

    // State pieces
    const appState = useSelector((state) => state.appState);
    const teamStats = useSelector((state) => state.teamStats.teamStats);
    const confArrs = useSelector((state) => state.teamStats.conferenceArrays);
    const playersPicks = useSelector((state) => state.tournamentPlayersPicks.picks);
    const roundOneMatchups = useSelector((state) => state.tournament.roundOneMatchups);
    const roundTwoMatchups = useSelector((state) => state.tournament.roundTwoMatchups);
    const playerScore = useSelector((state) => state.tournament.playerScore);
    console.log(playersPicks);
    // console.log(roundOneMatchups);
    console.log("Round 2", roundTwoMatchups);
    console.log("Score: ", playerScore);

    // Play round repeatable function
    const playTournamentround = useCallback((round, roundMatchups) => {
        const winningTeamsArr = [];

        Object.keys(roundMatchups).forEach((region) => {
            // Skip playin matchups
            if (region === "playin") return;

            // Play each matchup in each region and create results obj
            roundMatchups[region].forEach((matchup, i) => {
                // Play Game
                const gameResults = playGame(teamStats[findTeamConference(matchup[0].team, confArrs)][matchup[0].team], teamStats[findTeamConference(matchup[1].team, confArrs)][matchup[1].team]);
                const gameDispatchObj = getTournamentGameResultObj(gameResults, i, region);
                // Add Team Seed from Matchup 
                gameDispatchObj.winningTeam === matchup[0].team ? gameDispatchObj.seed = matchup[0].seed : 
                    gameDispatchObj.seed = matchup[1].seed;

                winningTeamsArr.push(gameDispatchObj.winningTeam);
                dispatch(tournamentActions.setTournamentGameResults({results: gameDispatchObj, round}));
            });
        });

        return winningTeamsArr;
    }, [dispatch, teamStats, confArrs]);

    // Play round 1
    useEffect(() => {
        // Check if Round 1
        if (!appState.tournamentPlayRoundOne || appState.tournamentPlayRoundTwo) return;
        // Play Round and send winners
        const winningTeamsArr = playTournamentround(1, roundOneMatchups);
        // Compare to picks
        // TODO: Makes sense to call comparative action here
        dispatch(tournamentActions.comparePicksAndGames({round: 1, winningTeams: winningTeamsArr, picks:playersPicks.roundTwoPicks}))
        // Switch app to round 2
        dispatch(appStateActions.activateTournamentRoundTwo());
    }, [dispatch, playTournamentround, appState, roundOneMatchups, playersPicks]);

    // TODO: Now need to check players picks against the new matchups

    return;
}

export default PlayStandardGames;