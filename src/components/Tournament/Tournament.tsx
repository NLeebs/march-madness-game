"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, tournamentActions, uiStateActions } from "@/store";
import {
  BracketColumn,
  PlayTournamentButton,
  RoundSelectBanner,
  TournamentActions,
  TournamentRound,
} from "@/src/components";
import { motion } from "framer-motion";
import styles from "@/src/components/Tournament/css/Tournament.module.css";
import { TOURNAMENT_BREAK_POINT } from "@/src/constants";
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

  const layout = getRoundLayout(selectedRound, screenWidth);
  const wide = screenWidth > TOURNAMENT_BREAK_POINT;
  const roundOneSize = layout[1].expanded ? "max-content" : 0;
  // True once the main-bracket replay starts (tournamentPlayGames, when the score appears) and
  // at the recap; false through the play-in replay.
  const tournamentStarted = appState.tournamentPlayGames || appState.tournamentRecap;

  const grid = (
    <div
      className={`relative grid ${wide ? "grid-flow-col" : `${styles.tournamentGrid} overflow-x-clip`}`}
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
        {/* Narrow: empty until the tournament starts, then the visible block moves above the grid
            and this cell keeps an invisible copy, so its height and the rows it spans don't change. */}
        <TournamentActions placeholder={!wide && tournamentStarted} />
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
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${wide ? "mx-auto max-w-tourny " : ""}grid grid-flow-row`}
    >
      {!wide && <RoundSelectBanner />}

      {/* One wrapper in both layouts, so crossing the break point only changes its classes and
          never remounts the bracket (PlayTournamentButton holds the pending request). Once the
          tournament has started, the visible actions block does move (finals cell when wide,
          above the grid when narrow), so it remounts on the crossing; it holds no state that matters.
          The narrow bracket scrolls vertically. The grid clips its off-screen rounds with
          overflow-x: clip, not hidden: a clip box is not a scroll container, so focus or
          scrollIntoView can't shift it sideways. Once the tournament starts, the score and the
          post-tournament actions sit above the grid, under the banner, so they are reachable
          whichever round is selected (finding 47). */}
      <div
        data-testid={wide ? undefined : "bracket-scroll"}
        className={
          wide
            ? undefined
            : "w-screen h-[calc(100vh-9rem)] overflow-y-scroll scrollable-container pb-12"
        }
      >
        {!wide && tournamentStarted && <TournamentActions />}
        {grid}
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
