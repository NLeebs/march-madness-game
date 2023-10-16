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
    const roundSweetSixteenMatchups = useSelector((state) => state.tournament.roundSweetSixteenMatchups);
    const roundEliteEightMatchups = useSelector((state) => state.tournament.roundEliteEightMatchups);
    const roundFinalFourMatchups = useSelector((state) => state.tournament.roundFinalFourMatchups);
    const roundFinalsMatchups = useSelector((state) => state.tournament.roundFinalsMatchups);
    
   
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
        dispatch(tournamentActions.comparePicksAndGames({round: 1, winningTeams: winningTeamsArr, picks:playersPicks.roundTwoPicks}));
        // Switch app to round 2
        dispatch(appStateActions.activateTournamentRoundTwo());
    }, [dispatch, playTournamentround, appState, roundOneMatchups, playersPicks]);

    // Play round 2
    useEffect(() => {
        // Check if Round 2
        if (!appState.tournamentPlayRoundTwo || appState.tournamentPlaySweetSixteen) return;
        // Play Round and send winners
        const winningTeamsArr = playTournamentround(2, roundTwoMatchups);
        // Compare to picks
        dispatch(tournamentActions.comparePicksAndGames({round: 2, winningTeams: winningTeamsArr, picks:playersPicks.roundSweetSixteenPicks}));
        // Switch app to round Sweet Sixteen
        dispatch(appStateActions.activateTournamentSweetSixteen());
    }, [dispatch, playTournamentround, appState, roundTwoMatchups, playersPicks]);

    // Play round Sweet Sixteen
    useEffect(() => {
        // Check if Round Sweet Sixteen
        if (!appState.tournamentPlaySweetSixteen || appState.tournamentPlayEliteEight) return;
        // Play Round and send winners
        const winningTeamsArr = playTournamentround("sweet sixteen", roundSweetSixteenMatchups);
        // Compare to picks
        dispatch(tournamentActions.comparePicksAndGames({round: "sweet sixteen", winningTeams: winningTeamsArr, picks:playersPicks.roundEliteEightPicks}));
        // Switch app to round Elite Eight
        dispatch(appStateActions.activateTournamentEliteEight());
    }, [dispatch, playTournamentround, appState, roundSweetSixteenMatchups, playersPicks]);

    // Play round Elite Eight
    useEffect(() => {
        // Check if Round Elite Eight
        if (!appState.tournamentPlayEliteEight || appState.tournamentPlayFinalFour) return;
        // Play Round and send winners
        const winningTeamsArr = playTournamentround("elite eight", roundEliteEightMatchups);
        // Compare to picks
        dispatch(tournamentActions.comparePicksAndGames({round: "elite eight", winningTeams: winningTeamsArr, picks:playersPicks.roundFinalFourPicks}));
        // Switch app to round Final Four
        dispatch(appStateActions.activateTournamentFinalFour());
    }, [dispatch, playTournamentround, appState, roundEliteEightMatchups, playersPicks]);

    // Play round Final Four
    useEffect(() => {
        // Check if Round Final Four
        if (!appState.tournamentPlayFinalFour || appState.tournamentPlayFinals) return;
        // Play Round and send winners
        const winningTeamsArr = playTournamentround("final four", roundFinalFourMatchups);
        // Compare to picks
        dispatch(tournamentActions.comparePicksAndGames({round: "final four", winningTeams: winningTeamsArr, picks:playersPicks.roundFinalsPicks}));
        // Switch app to round Finals
        dispatch(appStateActions.activateTournamentFinals());
    }, [dispatch, playTournamentround, appState, roundFinalFourMatchups, playersPicks]);

    // Play round Finals
    useEffect(() => {
        // Check if Round Finals
        if (!appState.tournamentPlayFinals || appState.activateTournamentRecap) return;
        // Play Round and send winners
        const winningTeamsArr = playTournamentround("finals", roundFinalsMatchups);
        // Compare to picks
        dispatch(tournamentActions.comparePicksAndGames({round: "finals", winningTeams: winningTeamsArr, picks:playersPicks.champion}));
        // Switch app to round Finals
        dispatch(appStateActions.activateTournamentRecap());
    }, [dispatch, playTournamentround, appState, roundFinalsMatchups, playersPicks]);


    return;
}

export default PlayStandardGames;