"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, tournamentActions, uiStateActions } from "@/store";
import {
  BracketColumn,
  Button,
  PlayerScore,
  PlayTournamentButton,
  RestartGameButton,
  RoundSelectBanner,
  TournamentRound,
} from "@/src/components";
import { motion } from "framer-motion";
import styles from "@/src/components/Tournament/css/Tournament.module.css";
import { PRIMARY_COLOR, TOURNAMENT_BREAK_POINT } from "@/src/constants";
import { BRACKET_ROUNDS, getRoundLayout } from "@/src/functions/tournament";

/** The top half's columns run outside-in; the bottom half mirrors them. */
const BOTTOM_ROUNDS = [...BRACKET_ROUNDS].reverse();

export const Tournament = () => {
  const dispatch = useDispatch();

  const appState = useSelector((state: RootState) => state.appState);
  const screenWidth = useSelector(
    (state: RootState) => state.uiState.screenWidth
  );
  const selectedRound = useSelector(
    (state: RootState) => state.uiState.selectedRound
  );

  useEffect(() => {
    dispatch(tournamentActions.setRoundOneMatchups());
  }, [dispatch]);

  useEffect(() => {
    if (screenWidth > TOURNAMENT_BREAK_POINT)
      dispatch(uiStateActions.selectRound({ newRound: 1 }));
  }, [dispatch, screenWidth]);

  const showTournamentRecapButtonHandler = () => {
    dispatch(uiStateActions.toggleRecapDialog());
  };

  const layout = getRoundLayout(selectedRound, screenWidth);
  const wide = screenWidth > TOURNAMENT_BREAK_POINT;
  const roundOneSize = layout[1].expanded ? "max-content" : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${wide ? "mx-auto max-w-tourny " : ""}grid grid-flow-row`}
    >
      {!wide && <RoundSelectBanner />}

      <div
        className={`relative grid ${
          wide
            ? "grid-flow-col"
            : `${styles.tournamentGrid} w-screen h-[calc(100vh-9rem)] overflow-x-hidden overflow-y-scroll scrollable-container pb-12`
        }`}
      >
        {BRACKET_ROUNDS.map((round) => (
          <BracketColumn
            key={`top-${round}`}
            round={round}
            half="top"
            layout={layout[round]}
            wide={wide}
          />
        ))}

        {/* Finals  */}
        <div
          className={
            wide ? "col-span-1 flex flex-col gap-y-4" : `h-max ${styles.gridFinal}`
          }
        >
          <div
            data-testid="bracket-column-finals"
            className="flex flex-col gap-y-16 min-w-300"
          >
            <TournamentRound
              region="championship"
              round="finals"
              roundUIPosition="finals"
            />
          </div>
          <div
            data-testid="bracket-column-champion"
            className="flex flex-col gap-y-16 min-w-300"
          >
            <TournamentRound
              region="champion"
              round="champion"
              roundUIPosition={0}
            />
          </div>
          {appState.tournamentSelection && <PlayTournamentButton />}
          <div className="flex flex-col justify-start items-center gap-4 mb-4">
            {appState.tournamentPlayGames && <PlayerScore />}
            {appState.tournamentRecap && (
              <Button
                onClick={showTournamentRecapButtonHandler}
                text="See Recap"
                backgroundColor={PRIMARY_COLOR}
              />
            )}
            {appState.tournamentRecap && <RestartGameButton />}
          </div>
        </div>

        {BOTTOM_ROUNDS.map((round) => (
          <BracketColumn
            key={`bottom-${round}`}
            round={round}
            half="bottom"
            layout={layout[round]}
            wide={wide}
          />
        ))}

        {/* Playin Games Smaller Screens  */}
        {!wide && (
          <motion.div
            data-testid="bracket-column-playin"
            initial={false}
            animate={{ width: roundOneSize, height: roundOneSize }}
            className={`overflow-hidden h-max ${styles.gridRound64} flex flex-col`}
          >
            <div className={`${styles.regionTitle} m-4`}>Playin Games</div>
            <TournamentRound
              region="playin"
              round="playin"
              roundUIPosition={layout[1].position}
            />
          </motion.div>
        )}
      </div>

      {/* Playin Games Larger Screens  */}
      {wide && (
        <div data-testid="bracket-column-playin">
          <TournamentRound region="playin" round="playin" />
        </div>
      )}
    </motion.div>
  );
};
