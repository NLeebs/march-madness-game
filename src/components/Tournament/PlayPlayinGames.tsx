// React Functions
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  RootState,
  appStateActions,
  tounramentPlayersPicksActions,
  tournamentActions,
} from "@/store";
import {
  findTeamConference,
  playGame,
  getTournamentGameResultObj,
} from "@/src/functions";
import { PlayInGameWinner } from "@/types";

export const PlayPlayinGames = () => {
  const dispatch = useDispatch();

  const teamStats = useSelector(
    (state: RootState) => state.teamStats.teamStats
  );
  const confArrs = useSelector(
    (state: RootState) => state.teamStats.conferenceArrays
  );
  const playinMatchups = useSelector(
    (state: RootState) => state.tournament.roundOneMatchups.playin
  );

  useEffect(() => {
    Object.keys(playinMatchups).forEach((seeds) => {
      playinMatchups[seeds].forEach((matchup, i) => {
        const gameResults = playGame(
          teamStats[findTeamConference(matchup[0].team, confArrs)][
            matchup[0].team
          ],
          teamStats[findTeamConference(matchup[1].team, confArrs)][
            matchup[1].team
          ]
        );
        const { gameIndex, winningTeam } = getTournamentGameResultObj(
          gameResults,
          i
        );
        const gameDispatchObj: PlayInGameWinner = {
          gameIndex,
          winningTeam,
          seedType: seeds,
        };

        dispatch(
          tounramentPlayersPicksActions.replacePlayinPicksWithWinner(
            gameDispatchObj
          )
        );
        dispatch(tournamentActions.setPlayinGameResults(gameDispatchObj));
      });
    });
    dispatch(appStateActions.activateTournamentStandardGames());
  }, [dispatch, playinMatchups, teamStats, confArrs]);

  return null;
};
