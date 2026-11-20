import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  RootState,
  appStateActions,
  uiStateActions,
  tournamentActions,
} from "@/store";
import { GameDataError } from "@/src/functions/generic";
import type { ScoredRound } from "@/types";

/** Replays the server's results (state.tournament.simulation) round by round. */
export const PlayTournamentGames = () => {
  const dispatch = useDispatch();

  const appState = useSelector((state: RootState) => state.appState);
  const playersPicks = useSelector(
    (state: RootState) => state.tournamentPlayersPicks.picks
  );
  const simulation = useSelector(
    (state: RootState) => state.tournament.simulation
  );

  /** Dispatches the round's results; returns the round's points and winners in play order. */
  const playTournamentRound = useCallback(
    (round: ScoredRound) => {
      if (!simulation) {
        throw new GameDataError("no tournament results", { round });
      }
      const results = simulation.rounds[round];
      results.forEach((result) => {
        dispatch(
          tournamentActions.setTournamentGameResults({ results: result, round })
        );
      });
      return {
        winningTeams: results.map((result) => result.winningTeam),
        points: simulation.roundPoints[round],
      };
    },
    [dispatch, simulation]
  );

  // Play round 1
  useEffect(() => {
    if (!appState.tournamentPlayRoundOne || appState.tournamentPlayRoundTwo)
      return;
    const { winningTeams, points } = playTournamentRound(1);
    dispatch(
      tournamentActions.recordRoundScore({
        round: 1,
        winningTeams,
        points,
        picks: playersPicks.roundTwoPicks,
      })
    );
    dispatch(appStateActions.activateTournamentRoundTwo());
  }, [dispatch, playTournamentRound, appState, playersPicks]);

  // Play round 2
  useEffect(() => {
    // Check if Round 2
    if (!appState.tournamentPlayRoundTwo || appState.tournamentPlaySweetSixteen)
      return;
    // Play Round and send winners
    const { winningTeams, points } = playTournamentRound(2);
    // Compare to picks
    dispatch(
      tournamentActions.recordRoundScore({
        round: 2,
        winningTeams,
        points,
        picks: playersPicks.roundSweetSixteenPicks,
      })
    );
    // Switch app to round Sweet Sixteen
    dispatch(appStateActions.activateTournamentSweetSixteen());
  }, [dispatch, playTournamentRound, appState, playersPicks]);

  // Play round Sweet Sixteen
  useEffect(() => {
    // Check if Round Sweet Sixteen
    if (
      !appState.tournamentPlaySweetSixteen ||
      appState.tournamentPlayEliteEight
    )
      return;
    // Play Round and send winners
    const { winningTeams, points } = playTournamentRound("sweet sixteen");
    // Compare to picks
    dispatch(
      tournamentActions.recordRoundScore({
        round: "sweet sixteen",
        winningTeams,
        points,
        picks: playersPicks.roundEliteEightPicks,
      })
    );
    // Switch app to round Elite Eight
    dispatch(appStateActions.activateTournamentEliteEight());
  }, [dispatch, playTournamentRound, appState, playersPicks]);

  // Play round Elite Eight
  useEffect(() => {
    // Check if Round Elite Eight
    if (!appState.tournamentPlayEliteEight || appState.tournamentPlayFinalFour)
      return;
    // Play Round and send winners
    const { winningTeams, points } = playTournamentRound("elite eight");
    // Compare to picks
    dispatch(
      tournamentActions.recordRoundScore({
        round: "elite eight",
        winningTeams,
        points,
        picks: playersPicks.roundFinalFourPicks,
      })
    );
    // Switch app to round Final Four
    dispatch(appStateActions.activateTournamentFinalFour());
  }, [dispatch, playTournamentRound, appState, playersPicks]);

  // Play round Final Four
  useEffect(() => {
    // Check if Round Final Four
    if (!appState.tournamentPlayFinalFour || appState.tournamentPlayFinals)
      return;
    // Play Round and send winners
    const { winningTeams, points } = playTournamentRound("final four");
    // Compare to picks
    dispatch(
      tournamentActions.recordRoundScore({
        round: "final four",
        winningTeams,
        points,
        picks: playersPicks.roundFinalsPicks,
      })
    );
    // Switch app to round Finals
    dispatch(appStateActions.activateTournamentFinals());
  }, [dispatch, playTournamentRound, appState, playersPicks]);

  // Play round Finals
  useEffect(() => {
    // Check if Round Finals
    if (!appState.tournamentPlayFinals || appState.tournamentRecap) return;
    // Play Round and send winners
    const { winningTeams, points } = playTournamentRound("finals");
    // Compare to picks
    dispatch(
      tournamentActions.recordRoundScore({
        round: "finals",
        winningTeams,
        points,
        picks: playersPicks.champion,
      })
    );
    // Switch app to round Finals
    dispatch(appStateActions.activateTournamentRecap());
    dispatch(uiStateActions.toggleRecapDialog());
  }, [dispatch, playTournamentRound, appState, playersPicks]);

  return null;
};
