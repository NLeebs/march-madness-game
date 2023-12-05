"use client"
// Libraries
import React, { Fragment }  from "react"
import { motion } from "framer-motion";
// React Functions
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux"
// State
import { tournamentActions } from "@/store/tournamentSlice";
import { uiStateActions } from "@/store/uiStateSlice";
// Components
import RoundSelectBanner from "./RoundSelectBanner";
import TournamentRound from "./TournamentRound";
import PlayTournamentButton from "../UI/PlayTournamentButton";
import PlayerScore from "./PlayerScore";
// CSS Styles
import styles from "./Tournament.module.css";
// Constants
import { TOURNAMENT_BREAK_POINT, 
        TOURNAMENT_ROUND_COLUMN_PX_WIDTH, 
        TOURNAMENT_ROUND_PLAYIN_DIV_PX_HEIGHT,
        XXXL_LARGE_BREAK_POINT,
        XXL_LARGE_BREAK_POINT,
        XL_LARGE_BREAK_POINT,
        LARGE_BREAK_POINT,
        MEDIUM_BREAK_POINT  } from "@/constants/CONSTANTS";



function Tournament(props) {
    const dispatch = useDispatch();

    const screenWidth = useSelector((state) => state.uiState.screenWidth);
    const selectedRound = useSelector((state => state.uiState.selectedRound));

    useEffect(() => {
        dispatch(tournamentActions.setRoundOneMatchups());
    }, [dispatch])

    useEffect(() => {
        if(screenWidth > TOURNAMENT_BREAK_POINT) dispatch(uiStateActions.selectRound({newRound: "round1",}));
    }, [dispatch, screenWidth]);

    // Determine UI position for each round
    let firstRoundUIPosition, secondRoundUIPosition, sweetSixteenUIPosition, eliteEightUIPosition, finalFourUIPosition, finalsUIPosition;
    if (selectedRound === "round1" || screenWidth > XXXL_LARGE_BREAK_POINT) {
        firstRoundUIPosition = 1; secondRoundUIPosition = 2; sweetSixteenUIPosition = 3; eliteEightUIPosition = 4;
        finalFourUIPosition = 5; finalsUIPosition = 6;
    } else if (selectedRound === "round2" || screenWidth > XXL_LARGE_BREAK_POINT) {
        secondRoundUIPosition = 1; sweetSixteenUIPosition = 2; eliteEightUIPosition = 3;
        finalFourUIPosition = 4; finalsUIPosition = 5;
        firstRoundUIPosition = 0;
    }

    return (
        <motion.div 
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            className="mx-auto max-w-tourny grid grid-flow-row"
        >
            {/* Round Button Banner */}
            {screenWidth < TOURNAMENT_BREAK_POINT && <RoundSelectBanner />}

            {/* Tournament Grid */}
            <div className={`
                    relative grid 
                    ${screenWidth > TOURNAMENT_BREAK_POINT ? 
                        "grid-flow-col" : 
                        `${styles.tournamentGrid} w-screen h-[calc(100vh-5.5rem)] overflow-x-hidden overflow-y-scroll scrollable-container`}
                `}
            >
                
                {/* Round 1 */}
                <motion.div 
                    initial={false}
                    animate={{width: selectedRound === "round1" || screenWidth > XXXL_LARGE_BREAK_POINT
                        ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0}}
                    className={`
                        overflow-x-clip h-max
                        ${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16 min-w-300" : styles.gridRound64Top}
                    `}
                >
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>West</div>}
                    <TournamentRound region="west" round="1" roundUIPosition={firstRoundUIPosition} 
                    />
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>East</div>}
                    <TournamentRound region="east" round="1" roundUIPosition={firstRoundUIPosition} 
                    />
                </motion.div>

                {/* Round 2 */}
                <motion.div 
                    initial={false}
                    animate={{
                        width: selectedRound === "round1" || selectedRound === "round2" || screenWidth > XXL_LARGE_BREAK_POINT
                            ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0
                    }}
                    className={`
                        overflow-x-clip h-max
                        ${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16 min-w-300 relative" : styles.gridRound32Top}
                    `}
                >
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>West</div>}
                    <TournamentRound region="west" round="2" roundUIPosition={secondRoundUIPosition}  />
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>East</div>}
                    <TournamentRound region="east" round="2" roundUIPosition={secondRoundUIPosition}  />
                </motion.div>

                {/* Sweet Sixteen */}
                <motion.div 
                    initial={false}
                    animate={{
                        width: selectedRound === "round1" || selectedRound === "round2" || selectedRound === "sweetSixteen" || screenWidth > XL_LARGE_BREAK_POINT 
                            ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0
                    }}
                    className={`
                        overflow-x-clip h-max
                        ${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16 min-w-300 absolute left-120" : styles.gridSweetSixteenTop}
                    `}
                >
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>West</div>}
                    <TournamentRound region="west" round="sweet sixteen" roundUIPosition={sweetSixteenUIPosition} />
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>East</div>}
                    <TournamentRound region="east" round="sweet sixteen" roundUIPosition={sweetSixteenUIPosition} />
                </motion.div>

                {/* Elite Eight  */}
                <motion.div 
                    initial={false}
                    animate={{
                        width: selectedRound !== "finalFour" && selectedRound !== "finals" || screenWidth > LARGE_BREAK_POINT
                            ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0
                    }}
                    className={`
                        overflow-x-clip h-max
                        ${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16 min-w-300 relative left-20" : styles.gridEliteEightTop}
                    `}
                >
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>West</div>}
                    <TournamentRound region="west" round="elite eight" roundUIPosition={eliteEightUIPosition} />
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>East</div>}
                    <TournamentRound region="east" round="elite eight" roundUIPosition={eliteEightUIPosition} />
                </motion.div>

                {/* Final Four  */}
                <motion.div
                    initial={false}
                    animate={{
                        width: selectedRound !== "finals" || screenWidth > MEDIUM_BREAK_POINT
                            ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0
                    }}  
                    className={`
                        overflow-x-clip h-max
                        ${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16 min-w-300 absolute left-156" : styles.gridFinalFourTop}
                    `}
                >
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>East & West</div>}
                    <TournamentRound region="eastWest" round="final four" roundUIPosition={finalFourUIPosition} />
                </motion.div>

                {/* Finals  */}
                <div className={`${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16" : ` h-max ${styles.gridFinal}`}`}>
                    <div className="flex flex-col gap-y-16 min-w-300">
                        <TournamentRound region="championship" round="finals" roundUIPosition={finalsUIPosition} />
                    </div>
                    <div className="flex flex-col gap-y-16 min-w-300">
                        <TournamentRound region="champion" round="champion" roundUIPosition={finalsUIPosition} />
                    </div>
                    <PlayTournamentButton />
                    {props.appState.tournamentPlayGames && <PlayerScore />}
                </div>

                {/* Final Four  */}
                <motion.div 
                    initial={false}
                    animate={{
                        width: selectedRound !== "finals" || screenWidth > MEDIUM_BREAK_POINT
                            ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0
                    }}  
                    className={`
                        overflow-x-clip  h-max
                        ${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16 min-w-300 absolute right-156" : styles.gridFinalFourBottom}
                    `}
                >
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>South & Midwest</div>}
                    <TournamentRound region="southMidwest" round="final four" roundUIPosition={finalFourUIPosition} />
                </motion.div>

                {/* Elite Eight  */}
                <motion.div
                    initial={false}
                    animate={{
                        width: selectedRound !== "finalFour" && selectedRound !== "finals" || screenWidth > LARGE_BREAK_POINT
                            ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0
                    }} 
                    className={`
                        overflow-x-clip  h-max
                        ${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16 min-w-300 relative right-20" : styles.gridEliteEightBottom}
                        `}
                    >
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>South</div>}
                    <TournamentRound region="south" round="elite eight" roundUIPosition={eliteEightUIPosition} />
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>Midwest</div>}
                    <TournamentRound region="midwest" round="elite eight" roundUIPosition={eliteEightUIPosition} />
                </motion.div>

                {/* Sweet Sixteen  */}
                <motion.div 
                    initial={false}
                    animate={{
                        width: selectedRound === "round1" || selectedRound === "round2" || selectedRound === "sweetSixteen" || screenWidth > XL_LARGE_BREAK_POINT
                            ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0
                    }}
                    className={`
                        overflow-x-clip  h-max
                        ${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16 min-w-300 absolute right-120" : styles.gridSweetSixteenBottom}
                    `}
                >
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>South</div>}
                    <TournamentRound region="south" round="sweet sixteen" roundUIPosition={sweetSixteenUIPosition} />
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>Midwest</div>}
                    <TournamentRound region="midwest" round="sweet sixteen" roundUIPosition={sweetSixteenUIPosition} />
                </motion.div>

                {/* Round 2  */}
                <motion.div 
                    initial={false}
                    animate={{
                        width: selectedRound === "round1" || selectedRound === "round2" || screenWidth > XXL_LARGE_BREAK_POINT
                            ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0
                    }} 
                    className={`
                    overflow-x-clip  h-max
                        ${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16 min-w-300 relative" : styles.gridRound32Bottom}
                    `}
                >
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>South</div>}
                    <TournamentRound region="south" round="2" 
                        roundUIPosition={
                            selectedRound === "round1" ? 
                                2 :
                                selectedRound === "round2" || screenWidth > XXL_LARGE_BREAK_POINT ? 1 : 0
                        }
                    />
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>Midwest</div>}
                    <TournamentRound region="midwest" round="2" />
                </motion.div>

                {/* Round 1  */}
                <motion.div
                    initial={false}
                    animate={{width: selectedRound === "round1" || screenWidth > XXXL_LARGE_BREAK_POINT
                        ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0}} 
                    className={`
                        overflow-hidden  h-max
                        ${screenWidth > TOURNAMENT_BREAK_POINT ? "col-span-1 flex flex-col gap-y-16 min-w-300" : styles.gridRound64Bottom}
                    `}
                >
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>South</div>}
                    <TournamentRound region="south" round="1" roundUIPosition={secondRoundUIPosition} 
                    />
                    {screenWidth < TOURNAMENT_BREAK_POINT && <div className={`${styles.regionTitle} m-4`}>Midwest</div>}
                    <TournamentRound region="midwest" round="1" roundUIPosition={secondRoundUIPosition} 
                    />
                </motion.div>

                {/* Playin Games Smaller Screens  */}
                {screenWidth < TOURNAMENT_BREAK_POINT &&
                    <motion.div 
                        initial={false}
                        animate={{
                            width: selectedRound === "round1" ? TOURNAMENT_ROUND_COLUMN_PX_WIDTH : 0,
                            height: selectedRound === "round1" ? TOURNAMENT_ROUND_PLAYIN_DIV_PX_HEIGHT : 0,
                        }}
                        className={`
                            overflow-hidden  h-max
                            ${screenWidth > TOURNAMENT_BREAK_POINT ? "" : `${styles.gridRound64} flex flex-col `}
                        `}
                    >
                        <div className={`${styles.regionTitle} m-4`}>Playin Games</div>
                        <TournamentRound region="playin" round="playin" roundUIPosition={firstRoundUIPosition}  
                        />
                    </motion.div>
                }
            </div>

            {/* Playin Games Larger Screens  */}
            {screenWidth > TOURNAMENT_BREAK_POINT &&
                <div>
                    <TournamentRound region="playin" round="playin" />
                </div>
            }
        </motion.div>
    );
}

export default Tournament;