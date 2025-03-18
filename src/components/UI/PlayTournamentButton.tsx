"use client";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, appStateActions } from "@/store";
import { Tournament } from "@/types";
import { BasketballSVG } from "@/src/components/Graphics";
import { PRIMARY_COLOR, SECONDARY_COLOR } from "@/src/constants";

export const PlayTournamentButton = () => {
  const dispatch = useDispatch();

  const playerPicksObj = useSelector<RootState, Tournament>(
    (state) => state.tournamentPlayersPicks.picks
  );

  const activateTournamentPlay = () => {
    dispatch(appStateActions.activateTournamentPlayinGamesState());
  };

  const isAllPicksSelected = Object.keys(playerPicksObj).every((round) => {
    return Object.keys(playerPicksObj[round]).every((region) => {
      return playerPicksObj[round][region].every((matchup) => {
        return matchup.every((team) => {
          return team.team !== "";
        });
      });
    });
  });

  return (
    <button
      disabled={!isAllPicksSelected}
      onClick={activateTournamentPlay}
      className={`relative rounded-full transition-transform ease-out "hover:scale-110" focus-visible:outline-neutral-300`}
    >
      <div
        className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full ${
          !isAllPicksSelected ? "opacity-50" : "opacity-20"
        }`}
        style={{
          backgroundColor: `${!isAllPicksSelected ? "#d1d5db" : PRIMARY_COLOR}`,
        }}
      ></div>
      <div
        className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full`}
      >
        <h3 className={`${"text-neutral-50"}`}>
          {!isAllPicksSelected ? "Fill In Bracket" : "Submit Picks"}
        </h3>
      </div>
      <div
        className={`${isAllPicksSelected && "motion-safe:animate-spin-slow"}`}
      >
        <BasketballSVG
          size={225}
          basketballColor={PRIMARY_COLOR}
          seamColor={SECONDARY_COLOR}
        />
      </div>
    </button>
  );
};
