// React Functions
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// Functions
import findTeamConference from "@/src/functions/teamStatsData/findTeamConference";
import playGame from "@/src/functions/playGame";
import getTournamentGameResultObj from "@/src/functions/tournament/getTournamentGameResultObj";
// State
import { appStateActions } from "@/store/appStateSlice";
import { tounramentPlayersPicksActions } from "@/store/tournamentPlayersPicksSlice";
import { tournamentActions } from "@/store/tournamentSlice";

function PlayPlayinGames() {
    const dispatch = useDispatch();

    const teamStats = useSelector((state) => state.teamStats.teamStats);
    const confArrs = useSelector((state) => state.teamStats.conferenceArrays);
    const playinMatchups = useSelector((state) => state.tournament.roundOneMatchups.playin);

    // Play playin games and send results to state
    useEffect(() => {
        Object.keys(playinMatchups).forEach((seeds) => {
            playinMatchups[seeds].forEach((matchup, i) => {
                // Play Game
                const gameResults = playGame(teamStats[findTeamConference(matchup[0].team, confArrs)][matchup[0].team], teamStats[findTeamConference(matchup[1].team, confArrs)][matchup[1].team]);
                const gameDispatchObj = getTournamentGameResultObj(gameResults, i);
                gameDispatchObj.seedType = seeds;

                dispatch(tounramentPlayersPicksActions.replacePlayinPicksWithWinner(gameDispatchObj));
                dispatch(tournamentActions.setPlayinGameResults(gameDispatchObj));
            });
        });
        dispatch(appStateActions.activateTournamentStandardGames());
    }, [dispatch, playinMatchups, teamStats, confArrs]);


    return;
}

export default PlayPlayinGames;