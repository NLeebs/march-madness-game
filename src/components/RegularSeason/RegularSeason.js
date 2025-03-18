"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { appStateActions } from "@/store/appStateSlice";
import separatePowerConferences from "@/src/functions/regularSeason/separatePowerConferences";
import { delay } from "@/src/functions/generic";
import ConferenceGroups from "./ConferenceGroups";
import PlayRegularSeasonGames from "./PlayRegularSeasonGames";
import SelectionSunday from "./SelectionSunday";
import Button from "../UI/Button";
// Constants
import {
  TIMER_TRIGGER_FADE,
  PRIMARY_COLOR,
  POWER_CONFERENCE_LIST,
} from "@/src/constants";

export const RegularSeason = (props) => {
  const dispatch = useDispatch();

  const appState = useSelector((state) => state.appState);

  // Split conferences for visualization
  const powerConferences = POWER_CONFERENCE_LIST;
  const otherConferences = separatePowerConferences(
    props.teamStats,
    powerConferences
  );

  useEffect(() => {
    Promise.all([delay(TIMER_TRIGGER_FADE)]).then(() => {
      dispatch(appStateActions.deactivateTransition());
    });
  }, [dispatch]);

  const selectionSundayButtonHandler = () => {
    dispatch(appStateActions.activateTournament());
    dispatch(appStateActions.activateTournamentSelectionStage());
  };

  // TODO: Add Regular Season Title
  // TODO: Add Selection Sunday Title
  return (
    <div className="h-screen overflow-y-scroll">
      <motion.div
        exit={{ opacity: 0 }}
        className="flex flex-col justify-center items-center p-8 gap-y-12"
      >
        <div className="flex flex-row flex-wrap justify-center gap-12">
          {powerConferences.map((conf) => (
            <ConferenceGroups
              key={conf}
              isPowerConf="true"
              conferenceTeams={props.teamStats[conf]}
            />
          ))}
          {otherConferences.map((conf) => (
            <ConferenceGroups
              key={conf}
              isPowerConf="false"
              conferenceTeams={props.teamStats[conf]}
            />
          ))}
        </div>
      </motion.div>
      {!appState.transition &&
        appState.regularSeason &&
        !appState.selectionSunday && (
          <PlayRegularSeasonGames teamStats={props.teamStats} />
        )}
      {appState.selectionSunday && <SelectionSunday />}
      {appState.selectionSunday && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full flex justify-center fixed z-10 bottom-10 motion-safe:animate-bounce"
        >
          <Button
            onClick={selectionSundayButtonHandler}
            text="Go to Tournament"
            backgroundColor={PRIMARY_COLOR}
          />
        </motion.div>
      )}
    </div>
  );
};
