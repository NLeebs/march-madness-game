// React Functions
import { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// State
import { tournamentActions } from "@/store/tournamentSlice";
// Constanst
import { AMOUNT_NONCONFERENCE_GAMES, AMOUNT_CONFERENCE_GAMES, AMOUNT_SEASON_GAMES } from "@/constants/CONSTANTS";


function SelectionSunday(props) {
    const dispatch = useDispatch();

    // App State
    const appState = useSelector((state) => state.appState);
    const seasonResults = useSelector((state) => state.regularSeasonRecords.records);
    const conferenceArrs = useSelector((state) => state.teamStats.conferenceArrays);

    console.log(seasonResults);
    

    const sortByTournamentScore = useCallback((arr) => {
        return [...arr].sort((a, b) => seasonResults[b].tournamentSelectionScore - seasonResults[a].tournamentSelectionScore);
    }, [seasonResults]);

    const sortByWins = useCallback((arr) => {
        return [...arr].sort((a, b) => seasonResults[b].wins - seasonResults[a].wins);
    }, [seasonResults]);

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
        const tournamentTeamsArr = [];
        const totalTeamsArr = Object.keys(seasonResults);
        const conferences = Object.keys(conferenceArrs);

        // Determine Confernece Champions
        conferences.forEach((conf) => {
            const champ = confChampions(conf);
            tournamentTeamsArr.push(champ);
            const champIndex = totalTeamsArr.indexOf(champ);
            totalTeamsArr.splice(champIndex, 1);
        });
        const wildcardTeamArr = sortByTournamentScore(totalTeamsArr);
        console.log(wildcardTeamArr);

        // Take top remaniming 36 Teams as wild cards
        for (let i = 0; i < 36; i++) {
            tournamentTeamsArr.push(wildcardTeamArr[i]);
        } 
        const finalTournamentTeamsArr = sortByTournamentScore(tournamentTeamsArr);

        return finalTournamentTeamsArr;
    }, [seasonResults, conferenceArrs, confChampions, sortByTournamentScore]);

    useEffect(() => {
        if (appState.selectionSunday === true) {
            dispatch(tournamentActions.addTournamentTeams(getTournamentTeams()));
        }
    }, [dispatch, appState, seasonResults, getTournamentTeams]);

    return;
}

export default SelectionSunday;