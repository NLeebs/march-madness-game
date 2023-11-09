// React Functions
import { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
import { tournamentActions } from "@/store/tournamentSlice";
// Functions
import delay from "@/src/functions/generic/delay";
// Constanst
import { NUMBER_OF_AT_LARGE_TEAMS, 
        NUMBER_OF_AT_LARGE_TEAMS_PLAYINS, 
        NUMBER_OF_CONF_CHAMP_PLAYINS,
        TIMER_BEFORE_TOURNAMENT } from "@/constants/CONSTANTS";


function SelectionSunday(props) {
    const dispatch = useDispatch();

    // App State
    const appState = useSelector((state) => state.appState);
    const seasonResults = useSelector((state) => state.regularSeasonRecords.records);
    const conferenceArrs = useSelector((state) => state.teamStats.conferenceArrays);
    
    // Sort Functions
    const sortByTournamentScore = useCallback((arr) => {
        return [...arr].sort((a, b) => seasonResults[b].tournamentSelectionScore - seasonResults[a].tournamentSelectionScore);
    }, [seasonResults]);

    const sortByWins = useCallback((arr) => {
        return [...arr].sort((a, b) => seasonResults[b].wins - seasonResults[a].wins);
    }, [seasonResults]);

    // Selection Functions
    const confChampions = useCallback((curConference) => {
        const conferenceTeams = conferenceArrs[curConference];
        const sortedConferenceTeamsWins = sortByWins(conferenceTeams);
        
        if (seasonResults[sortedConferenceTeamsWins[0]].wins > seasonResults[sortedConferenceTeamsWins[1]].wins) {
            // Sort by wins
            return sortedConferenceTeamsWins[0];
        } else {
            //Tie Break
            const winTieArr = sortedConferenceTeamsWins.filter((team) => seasonResults[team].wins === seasonResults[sortedConferenceTeamsWins[0]].wins)
            const sortedWinTieArr = sortByTournamentScore(winTieArr);
            return sortedWinTieArr[0];
        }
    }, [seasonResults, conferenceArrs, sortByTournamentScore, sortByWins]);
    
    const getTournamentTeams = useCallback(() => {
        // init
        let tournamentTeamsArr = [];
        const totalTeamsArr = Object.keys(seasonResults);
        const conferences = Object.keys(conferenceArrs);

        // Determine Confernece Champions
        conferences.forEach((conf) => {
            const champ = confChampions(conf);
            dispatch(regularSeasonRecordActions.addConferneceChampion({confChampion: champ,}));
            tournamentTeamsArr.push(champ);
            const champIndex = totalTeamsArr.indexOf(champ);
            totalTeamsArr.splice(champIndex, 1);
        });
        // Grab last two conference champs for playin games
        tournamentTeamsArr = sortByTournamentScore(tournamentTeamsArr);
        for (let i = 1; i <= NUMBER_OF_CONF_CHAMP_PLAYINS; i++) {
            dispatch(tournamentActions.setPlayinTeams({seed: 16, team: tournamentTeamsArr.splice(tournamentTeamsArr.length - 1, 1)[0]}));
        }

        // Take top remaniming 36 Teams as wild cards
        const atLargeTeamArr = sortByTournamentScore(totalTeamsArr);
        for (let i = 0; i < NUMBER_OF_AT_LARGE_TEAMS; i++) {
            if (i < (NUMBER_OF_AT_LARGE_TEAMS - NUMBER_OF_AT_LARGE_TEAMS_PLAYINS)) tournamentTeamsArr.push(atLargeTeamArr[i]);
            else dispatch(tournamentActions.setPlayinTeams({seed: 11, team: atLargeTeamArr[i]}));
        } 
        const finalTournamentTeamsArr = sortByTournamentScore(tournamentTeamsArr);

        return finalTournamentTeamsArr;
    }, [dispatch, seasonResults, conferenceArrs, confChampions, sortByTournamentScore]);

    // Select and dispatch
    useEffect(() => {
        if (appState.selectionSunday === true && appState.transition === false) {
            dispatch(tournamentActions.addTournamentTeams(getTournamentTeams()));
            dispatch(tournamentActions.setTournamentSeeds());
            dispatch(appStateActions.activateTransition());
            Promise.all([delay(TIMER_BEFORE_TOURNAMENT)]).then(() => {
                dispatch(appStateActions.activateTournament());
                dispatch(appStateActions.activateTournamentSelectionStage());
            })
        }
    }, [dispatch, appState, seasonResults, getTournamentTeams]);

    return;
}

export default SelectionSunday;