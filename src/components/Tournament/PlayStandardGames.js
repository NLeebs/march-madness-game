// React Functions
import { useEffect } from "react";
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

    const appState = useSelector((state) => state.appState);
    const teamStats = useSelector((state) => state.teamStats.teamStats);
    const confArrs = useSelector((state) => state.teamStats.conferenceArrays);
    const roundOneMatchups = useSelector((state) => state.tournament.roundOneMatchups);
    const roundTwoMatchups = useSelector((state) => state.tournament.roundTwoMatchups);
    console.log(roundOneMatchups);
    console.log(roundTwoMatchups);

    useEffect(() => {
        // Check if Round 1
        if (!appState.tournamentPlayRoundOne) return;

        Object.keys(roundOneMatchups).forEach((region) => {
            // Skip playin matchups
            if (region === "playin") return;

            // TODO: Can put this part into a useCallback function
            // Play each matchup in each region and create results obj
            roundOneMatchups[region].forEach((matchup, i) => {
                // Play Game
                const gameResults = playGame(teamStats[findTeamConference(matchup[0].team, confArrs)][matchup[0].team], teamStats[findTeamConference(matchup[1].team, confArrs)][matchup[1].team]);
                const gameDispatchObj = getTournamentGameResultObj(gameResults, i, region);
                // Add Team Seed from Matchup 
                gameDispatchObj.winningTeam === matchup[0].team ? gameDispatchObj.seed = matchup[0].seed : 
                    gameDispatchObj.seed = matchup[1].seed;

                dispatch(tournamentActions.setTournamentGameResults({results: gameDispatchObj, round: 1}));
            });
        });

        dispatch(appStateActions.activateTournamentRoundTwo());
    }, [dispatch, appState, roundOneMatchups, teamStats, confArrs]);


    return;
}

export default PlayStandardGames;