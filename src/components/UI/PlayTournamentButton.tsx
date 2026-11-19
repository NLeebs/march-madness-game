"use client";
import React, { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, appStateActions, tournamentActions } from "@/store";
import { useAuth, usePlayTournament } from "@/src/hooks";
import { getAnonUserId } from "@/src/utils/getAnonUserId";
import { BasketballSVG } from "@/src/components/Graphics";
import { PRIMARY_COLOR, SECONDARY_COLOR } from "@/src/constants";

export const PlayTournamentButton = () => {
  const dispatch = useDispatch();

  const playerPicksObj = useSelector(
    (state: RootState) => state.tournamentPlayersPicks.picks
  );
  const yearId = useSelector((state: RootState) => state.tournament.yearId);
  const tournamentTeams = useSelector(
    (state: RootState) => state.tournament.tournamentTeams
  );
  const playinTeams = useSelector(
    (state: RootState) => state.tournament.playinTeams
  );
  const { user } = useAuth() as { user: { id?: string } | null };
  const { mutate, isPending } = usePlayTournament();
  // isPending updates a tick after mutate; the ref blocks a second click before that.
  const submittedRef = useRef(false);

  const activateTournamentPlay = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    mutate(
      {
        yearId,
        field: { tournamentTeams, playinTeams },
        picks: playerPicksObj,
        anonUserId: user ? null : getAnonUserId(),
      },
      {
        onSuccess: ({ playin, rounds, roundPoints, score }) => {
          dispatch(
            tournamentActions.setSimulation({ playin, rounds, roundPoints, score })
          );
          dispatch(appStateActions.activateTournamentPlayinGamesState());
        },
      }
    );
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
    <div className="flex justify-center items-center">
      <button
        disabled={!isAllPicksSelected || isPending}
        onClick={activateTournamentPlay}
        className={`relative w-[14rem] rounded-full transition-transform ease-out "hover:scale-110" focus-visible:outline-neutral-300`}
      >
        <div
          className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full ${
            !isAllPicksSelected ? "opacity-50" : "opacity-20"
          }`}
          style={{
            backgroundColor: `${
              !isAllPicksSelected ? "#d1d5db" : PRIMARY_COLOR
            }`,
          }}
        ></div>
        <div
          className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full`}
        >
          <h3 className={"text-neutral-50"}>
            {isPending
              ? "Tipping off..."
              : !isAllPicksSelected
                ? "Fill In Bracket"
                : "Submit Picks"}
          </h3>
        </div>
        <div
          className={`${isAllPicksSelected && "motion-safe:animate-spin-slow"}`}
        >
          <BasketballSVG
            size={224}
            basketballColor={PRIMARY_COLOR}
            seamColor={SECONDARY_COLOR}
          />
        </div>
      </button>
    </div>
  );
};
