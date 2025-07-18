"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, tournamentActions, uiStateActions } from "@/store";
import {
  Button,
  PlayerScore,
  PlayTournamentButton,
  RestartGameButton,
  RoundSelectBanner,
  TournamentRound,
} from "@/src/components";
import { motion } from "framer-motion";
import styles from "@/src/components/Tournament/css/Tournament.module.css";
import {
  PRIMARY_COLOR,
  TOURNAMENT_BREAK_POINT,
  XXXL_LARGE_BREAK_POINT,
  XXL_LARGE_BREAK_POINT,
  XL_LARGE_BREAK_POINT,
  LARGE_BREAK_POINT,
  MEDIUM_BREAK_POINT,
} from "@/src/constants";

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

  let firstRoundUIPosition: number,
    secondRoundUIPosition: number,
    sweetSixteenUIPosition: number,
    eliteEightUIPosition: number,
    finalFourUIPosition: number;
  const finalsUIPosition = "finals";
  if (selectedRound === 1 || screenWidth > XXXL_LARGE_BREAK_POINT) {
    firstRoundUIPosition = 1;
    secondRoundUIPosition = 2;
    sweetSixteenUIPosition = 3;
    eliteEightUIPosition = 4;
    finalFourUIPosition = 5;
  } else if (selectedRound === 2 || screenWidth > XXL_LARGE_BREAK_POINT) {
    secondRoundUIPosition = 1;
    sweetSixteenUIPosition = 2;
    eliteEightUIPosition = 3;
    finalFourUIPosition = 4;
    firstRoundUIPosition = 0;
  } else if (
    selectedRound === "sweet sixteen" ||
    screenWidth > XL_LARGE_BREAK_POINT
  ) {
    sweetSixteenUIPosition = 1;
    eliteEightUIPosition = 2;
    finalFourUIPosition = 3;
    firstRoundUIPosition = secondRoundUIPosition = 0;
  } else if (
    selectedRound === "elite eight" ||
    screenWidth > LARGE_BREAK_POINT
  ) {
    eliteEightUIPosition = 1;
    finalFourUIPosition = 2;
    firstRoundUIPosition = secondRoundUIPosition = sweetSixteenUIPosition = 0;
  } else if (
    selectedRound === "final four" ||
    screenWidth > MEDIUM_BREAK_POINT
  ) {
    finalFourUIPosition = 1;
    firstRoundUIPosition =
      secondRoundUIPosition =
      sweetSixteenUIPosition =
      eliteEightUIPosition =
        0;
  } else if (selectedRound === "finals") {
    firstRoundUIPosition =
      secondRoundUIPosition =
      sweetSixteenUIPosition =
      eliteEightUIPosition =
      finalFourUIPosition =
        0;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-tourny grid grid-flow-row"
    >
      {screenWidth < TOURNAMENT_BREAK_POINT && <RoundSelectBanner />}

      <div
        className={`
                    relative grid 
                    ${
                      screenWidth > TOURNAMENT_BREAK_POINT
                        ? "grid-flow-col"
                        : `${styles.tournamentGrid} w-screen h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-scroll scrollable-container`
                    }
                `}
      >
        <motion.div
          initial={false}
          animate={{
            width:
              selectedRound === 1 || screenWidth > XXXL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
            height:
              selectedRound === 1 || screenWidth > XXXL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
          }}
          className={`
                        overflow-x-clip h-max
                        ${
                          screenWidth > TOURNAMENT_BREAK_POINT
                            ? "col-span-1 flex flex-col gap-y-16 min-w-300"
                            : styles.gridRound64Top
                        }
                    `}
        >
          <TournamentRound
            region="west"
            round={1}
            roundUIPosition={firstRoundUIPosition}
          />
          <TournamentRound
            region="east"
            round={1}
            roundUIPosition={firstRoundUIPosition}
          />
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            width:
              selectedRound === 1 ||
              selectedRound === 2 ||
              screenWidth > XXL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
            height:
              selectedRound === 1 ||
              selectedRound === 2 ||
              screenWidth > XXL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
          }}
          className={`
                        overflow-x-clip h-max
                        ${
                          screenWidth > TOURNAMENT_BREAK_POINT
                            ? "col-span-1 flex flex-col gap-y-16 min-w-300 relative"
                            : styles.gridRound32Top
                        }
                    `}
        >
          <TournamentRound
            region="west"
            round={2}
            roundUIPosition={secondRoundUIPosition}
          />
          <TournamentRound
            region="east"
            round={2}
            roundUIPosition={secondRoundUIPosition}
          />
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            width:
              selectedRound === 1 ||
              selectedRound === 2 ||
              selectedRound === "sweet sixteen" ||
              screenWidth > XL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
            height:
              selectedRound === 1 ||
              selectedRound === 2 ||
              selectedRound === "sweet sixteen" ||
              screenWidth > XL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
          }}
          className={`
                        overflow-x-clip h-max
                        ${
                          screenWidth > TOURNAMENT_BREAK_POINT
                            ? "col-span-1 flex flex-col gap-y-16 min-w-300 absolute left-120"
                            : styles.gridSweetSixteenTop
                        }
                    `}
        >
          <TournamentRound
            region="west"
            round="sweet sixteen"
            roundUIPosition={sweetSixteenUIPosition}
          />
          <TournamentRound
            region="east"
            round="sweet sixteen"
            roundUIPosition={sweetSixteenUIPosition}
          />
        </motion.div>

        {/* Elite Eight  */}
        <motion.div
          initial={false}
          animate={{
            width:
              (selectedRound !== "final four" && selectedRound !== "finals") ||
              screenWidth > LARGE_BREAK_POINT
                ? "max-content"
                : 0,
            height:
              (selectedRound !== "final four" && selectedRound !== "finals") ||
              screenWidth > LARGE_BREAK_POINT
                ? "max-content"
                : 0,
          }}
          className={`
                        overflow-x-clip h-max
                        ${
                          screenWidth > TOURNAMENT_BREAK_POINT
                            ? "col-span-1 flex flex-col gap-y-16 min-w-300 relative left-20"
                            : styles.gridEliteEightTop
                        }
                    `}
        >
          <TournamentRound
            region="west"
            round="elite eight"
            roundUIPosition={eliteEightUIPosition}
          />
          <TournamentRound
            region="east"
            round="elite eight"
            roundUIPosition={eliteEightUIPosition}
          />
        </motion.div>

        {/* Final Four  */}
        <motion.div
          initial={false}
          animate={{
            width:
              selectedRound !== "finals" || screenWidth > MEDIUM_BREAK_POINT
                ? "max-content"
                : 0,
            height:
              selectedRound !== "finals" || screenWidth > MEDIUM_BREAK_POINT
                ? "max-content"
                : 0,
          }}
          className={`
                        overflow-x-clip h-max
                        ${
                          screenWidth > TOURNAMENT_BREAK_POINT
                            ? "col-span-1 flex flex-col gap-y-16 min-w-300 absolute left-156"
                            : styles.gridFinalFourTop
                        }
                    `}
        >
          <TournamentRound
            region="eastWest"
            round="final four"
            roundUIPosition={finalFourUIPosition}
          />
        </motion.div>

        {/* Finals  */}
        <div
          className={`${
            screenWidth > TOURNAMENT_BREAK_POINT
              ? "col-span-1 flex flex-col gap-y-4"
              : ` h-max ${styles.gridFinal}`
          }`}
        >
          <div className="flex flex-col gap-y-16 min-w-300">
            <TournamentRound
              region="championship"
              round="finals"
              roundUIPosition={finalsUIPosition}
            />
          </div>
          <div className="flex flex-col gap-y-16 min-w-300">
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

        {/* Final Four  */}
        <motion.div
          initial={false}
          animate={{
            width:
              selectedRound !== "finals" || screenWidth > MEDIUM_BREAK_POINT
                ? "max-content"
                : 0,
            height:
              selectedRound !== "finals" || screenWidth > MEDIUM_BREAK_POINT
                ? "max-content"
                : 0,
          }}
          className={`
                        overflow-x-clip  h-max
                        ${
                          screenWidth > TOURNAMENT_BREAK_POINT
                            ? "col-span-1 flex flex-col gap-y-16 min-w-300 absolute right-156"
                            : styles.gridFinalFourBottom
                        }
                    `}
        >
          <TournamentRound
            region="southMidwest"
            round="final four"
            roundUIPosition={finalFourUIPosition}
          />
        </motion.div>

        {/* Elite Eight  */}
        <motion.div
          initial={false}
          animate={{
            width:
              (selectedRound !== "final four" && selectedRound !== "finals") ||
              screenWidth > LARGE_BREAK_POINT
                ? "max-content"
                : 0,
            height:
              (selectedRound !== "final four" && selectedRound !== "finals") ||
              screenWidth > LARGE_BREAK_POINT
                ? "max-content"
                : 0,
          }}
          className={`
                        overflow-x-clip  h-max
                        ${
                          screenWidth > TOURNAMENT_BREAK_POINT
                            ? "col-span-1 flex flex-col gap-y-16 min-w-300 relative right-20"
                            : styles.gridEliteEightBottom
                        }
                        `}
        >
          <TournamentRound
            region="south"
            round="elite eight"
            roundUIPosition={eliteEightUIPosition}
          />
          <TournamentRound
            region="midwest"
            round="elite eight"
            roundUIPosition={eliteEightUIPosition}
          />
        </motion.div>

        {/* Sweet Sixteen  */}
        <motion.div
          initial={false}
          animate={{
            width:
              selectedRound === 1 ||
              selectedRound === 2 ||
              selectedRound === "sweet sixteen" ||
              screenWidth > XL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
            height:
              selectedRound === 1 ||
              selectedRound === 2 ||
              selectedRound === "sweet sixteen" ||
              screenWidth > XL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
          }}
          className={`
                        overflow-x-clip  h-max
                        ${
                          screenWidth > TOURNAMENT_BREAK_POINT
                            ? "col-span-1 flex flex-col gap-y-16 min-w-300 absolute right-120"
                            : styles.gridSweetSixteenBottom
                        }
                    `}
        >
          <TournamentRound
            region="south"
            round="sweet sixteen"
            roundUIPosition={sweetSixteenUIPosition}
          />
          <TournamentRound
            region="midwest"
            round="sweet sixteen"
            roundUIPosition={sweetSixteenUIPosition}
          />
        </motion.div>

        {/* Round 2  */}
        <motion.div
          initial={false}
          animate={{
            width:
              selectedRound === 1 ||
              selectedRound === 2 ||
              screenWidth > XXL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
            height:
              selectedRound === 1 ||
              selectedRound === 2 ||
              screenWidth > XXL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
          }}
          className={`
                    overflow-x-clip  h-max
                        ${
                          screenWidth > TOURNAMENT_BREAK_POINT
                            ? "col-span-1 flex flex-col gap-y-16 min-w-300 relative"
                            : styles.gridRound32Bottom
                        }
                    `}
        >
          <TournamentRound
            region="south"
            round={2}
            roundUIPosition={secondRoundUIPosition}
          />
          <TournamentRound
            region="midwest"
            round={2}
            roundUIPosition={secondRoundUIPosition}
          />
        </motion.div>

        {/* Round 1  */}
        <motion.div
          initial={false}
          animate={{
            width:
              selectedRound === 1 || screenWidth > XXXL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
            height:
              selectedRound === 1 || screenWidth > XXXL_LARGE_BREAK_POINT
                ? "max-content"
                : 0,
          }}
          className={`
                        overflow-hidden  h-max
                        ${
                          screenWidth > TOURNAMENT_BREAK_POINT
                            ? "col-span-1 flex flex-col gap-y-16 min-w-300"
                            : styles.gridRound64Bottom
                        }
                    `}
        >
          <TournamentRound
            region="south"
            round={1}
            roundUIPosition={firstRoundUIPosition}
          />
          <TournamentRound
            region="midwest"
            round={1}
            roundUIPosition={firstRoundUIPosition}
          />
        </motion.div>

        {/* Playin Games Smaller Screens  */}
        {screenWidth < TOURNAMENT_BREAK_POINT && (
          <motion.div
            initial={false}
            animate={{
              width:
                selectedRound === 1 || screenWidth > XXXL_LARGE_BREAK_POINT
                  ? "max-content"
                  : 0,
              height:
                selectedRound === 1 || screenWidth > XXXL_LARGE_BREAK_POINT
                  ? "max-content"
                  : 0,
            }}
            className={`
                            overflow-hidden  h-max
                            ${
                              screenWidth > TOURNAMENT_BREAK_POINT
                                ? ""
                                : `${styles.gridRound64} flex flex-col `
                            }
                        `}
          >
            <div className={`${styles.regionTitle} m-4`}>Playin Games</div>
            <TournamentRound
              region="playin"
              round="playin"
              roundUIPosition={firstRoundUIPosition}
            />
          </motion.div>
        )}
      </div>

      {/* Playin Games Larger Screens  */}
      {screenWidth > TOURNAMENT_BREAK_POINT && (
        <div>
          <TournamentRound region="playin" round="playin" />
        </div>
      )}
    </motion.div>
  );
};
