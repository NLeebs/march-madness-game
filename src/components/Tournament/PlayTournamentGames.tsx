import React, { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  RootState,
  appStateActions,
  uiStateActions,
  tournamentActions,
} from "@/store";
import {
  getTournamentGameResultObj,
  findTeamConference,
  playGame,
} from "@/src/functions";
import {
  TournamentMatchup,
  TournamentRegion,
  TournamentRound,
  TournamentRoundMatchups,
} from "@/types";

export const PlayTournamentGames = () => {
  const dispatch = useDispatch();

  const appState = useSelector((state: RootState) => state.appState);
  const teamStats = useSelector(
    (state: RootState) => state.teamStats.teamStats
  );
  const confArrs = useSelector(
    (state: RootState) => state.teamStats.conferenceArrays
  );
  const playersPicks = useSelector(
    (state: RootState) => state.tournamentPlayersPicks.picks
  );
  const {
    roundOneMatchups,
    roundTwoMatchups,
    roundSweetSixteenMatchups,
    roundEliteEightMatchups,
    roundFinalFourMatchups,
    roundFinalsMatchups,
  } = useSelector((state: RootState) => state.tournament);

  const playTournamentRound = useCallback(
    (round: TournamentRound, roundMatchups: TournamentRoundMatchups) => {
      const winningTeamsArr = [];

      Object.keys(roundMatchups).forEach((region: TournamentRegion) => {
        if (region === "playin") return;

        roundMatchups[region].forEach(
          (matchup: TournamentMatchup, i: number) => {
            const gameResults = playGame(
              teamStats[findTeamConference(matchup[0].team, confArrs)][
                matchup[0].team
              ],
              teamStats[findTeamConference(matchup[1].team, confArrs)][
                matchup[1].team
              ]
            );
            const gameDispatchObj = getTournamentGameResultObj(
              gameResults,
              i,
              region
            );
            gameDispatchObj.seed =
              gameDispatchObj.winningTeam === matchup[0].team
                ? matchup[0].seed
                : matchup[1].seed;

            winningTeamsArr.push(gameDispatchObj.winningTeam);
            dispatch(
              tournamentActions.setTournamentGameResults({
                results: gameDispatchObj,
                round,
              })
            );
          }
        );
      });

      return winningTeamsArr;
    },
    [dispatch, teamStats, confArrs]
  );

  // Play round 1
  useEffect(() => {
    if (!appState.tournamentPlayRoundOne || appState.tournamentPlayRoundTwo)
      return;
    const winningTeamsArr = playTournamentRound(1, roundOneMatchups);
    dispatch(
      tournamentActions.comparePicksAndGames({
        round: 1,
        winningTeams: winningTeamsArr,
        picks: playersPicks.roundTwoPicks,
      })
    );
    dispatch(appStateActions.activateTournamentRoundTwo());
  }, [dispatch, playTournamentRound, appState, roundOneMatchups, playersPicks]);

  // Play round 2
  useEffect(() => {
    // Check if Round 2
    if (!appState.tournamentPlayRoundTwo || appState.tournamentPlaySweetSixteen)
      return;
    // Play Round and send winners
    const winningTeamsArr = playTournamentRound(2, roundTwoMatchups);
    // Compare to picks
    dispatch(
      tournamentActions.comparePicksAndGames({
        round: 2,
        winningTeams: winningTeamsArr,
        picks: playersPicks.roundSweetSixteenPicks,
      })
    );
    // Switch app to round Sweet Sixteen
    dispatch(appStateActions.activateTournamentSweetSixteen());
  }, [dispatch, playTournamentRound, appState, roundTwoMatchups, playersPicks]);

  // Play round Sweet Sixteen
  useEffect(() => {
    // Check if Round Sweet Sixteen
    if (
      !appState.tournamentPlaySweetSixteen ||
      appState.tournamentPlayEliteEight
    )
      return;
    // Play Round and send winners
    const winningTeamsArr = playTournamentRound(
      "sweet sixteen",
      roundSweetSixteenMatchups
    );
    // Compare to picks
    dispatch(
      tournamentActions.comparePicksAndGames({
        round: "sweet sixteen",
        winningTeams: winningTeamsArr,
        picks: playersPicks.roundEliteEightPicks,
      })
    );
    // Switch app to round Elite Eight
    dispatch(appStateActions.activateTournamentEliteEight());
  }, [
    dispatch,
    playTournamentRound,
    appState,
    roundSweetSixteenMatchups,
    playersPicks,
  ]);

  // Play round Elite Eight
  useEffect(() => {
    // Check if Round Elite Eight
    if (!appState.tournamentPlayEliteEight || appState.tournamentPlayFinalFour)
      return;
    // Play Round and send winners
    const winningTeamsArr = playTournamentRound(
      "elite eight",
      roundEliteEightMatchups
    );
    // Compare to picks
    dispatch(
      tournamentActions.comparePicksAndGames({
        round: "elite eight",
        winningTeams: winningTeamsArr,
        picks: playersPicks.roundFinalFourPicks,
      })
    );
    // Switch app to round Final Four
    dispatch(appStateActions.activateTournamentFinalFour());
  }, [
    dispatch,
    playTournamentRound,
    appState,
    roundEliteEightMatchups,
    playersPicks,
  ]);

  // Play round Final Four
  useEffect(() => {
    // Check if Round Final Four
    if (!appState.tournamentPlayFinalFour || appState.tournamentPlayFinals)
      return;
    // Play Round and send winners
    const winningTeamsArr = playTournamentRound(
      "final four",
      roundFinalFourMatchups
    );
    // Compare to picks
    dispatch(
      tournamentActions.comparePicksAndGames({
        round: "final four",
        winningTeams: winningTeamsArr,
        picks: playersPicks.roundFinalsPicks,
      })
    );
    // Switch app to round Finals
    dispatch(appStateActions.activateTournamentFinals());
  }, [
    dispatch,
    playTournamentRound,
    appState,
    roundFinalFourMatchups,
    playersPicks,
  ]);

  // Play round Finals
  useEffect(() => {
    // Check if Round Finals
    if (!appState.tournamentPlayFinals || appState.tournamentRecap) return;
    // Play Round and send winners
    const winningTeamsArr = playTournamentRound("finals", roundFinalsMatchups);
    // Compare to picks
    dispatch(
      tournamentActions.comparePicksAndGames({
        round: "finals",
        winningTeams: winningTeamsArr,
        picks: playersPicks.champion,
      })
    );
    // Switch app to round Finals
    dispatch(appStateActions.activateTournamentRecap());
    dispatch(uiStateActions.toggleRecapDialog());
  }, [
    dispatch,
    playTournamentRound,
    appState,
    roundFinalsMatchups,
    playersPicks,
  ]);
};
