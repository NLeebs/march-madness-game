"use client";
import React from "react";
import { useSelector } from "react-redux";
import { TournamentRound } from "@/types";
import { RootState } from "@/store";
import Image from "next/image";
import { PingNotification } from "@/src/components";
import { findTeamConference } from "@/src/functions";
import { NON_CTA_BUTTON_COLOR } from "@/src/constants/CONSTANTS";

interface TeamBarProps {
  team: string;
  round?: TournamentRound | "playin";
  score?: string;
  win?: boolean;
}

export const TeamBar: React.FC<TeamBarProps> = ({
  team,
  round,
  score,
  win,
}) => {
  const appState = useSelector((state: RootState) => state.appState);
  const teamStats = useSelector(
    (state: RootState) => state.teamStats.teamStats
  );
  const confArrs = useSelector(
    (state: RootState) => state.teamStats.conferenceArrays
  );
  const regularSeasonRecords = useSelector(
    (state: RootState) => state.regularSeasonRecords.records
  );
  const tournamentTeamsArr = useSelector(
    (state: RootState) => state.tournament.tournamentTeams
  );
  const playinTeamMatchups = useSelector(
    (state: RootState) => state.tournament.roundOneMatchups.playin
  );
  const playinTeamsObj = useSelector(
    (state: RootState) => state.tournament.playinTeams
  );

  const teamConf = findTeamConference(team, confArrs);

  let isPlayin;
  let teamLogoPath;
  if (
    team === "playinGameSeed11Game1" ||
    team === "playinGameSeed11Game2" ||
    team === "playinGameSeed16Game1" ||
    team === "playinGameSeed16Game2"
  ) {
    isPlayin = true;
  } else if (team !== "") {
    isPlayin = false;
    teamLogoPath = teamStats[teamConf][team].logo;
  }

  let teamBarClasses,
    teamBarNameClasses = "";
  if (
    appState.selectionSunday &&
    (tournamentTeamsArr.includes(team) ||
      playinTeamsObj.elevenSeeds.includes(team) ||
      playinTeamsObj.sixteenSeeds.includes(team))
  )
    teamBarClasses = `animate-pulse`;

  return (
    <div
      className={`w-full relative flex justify-between items-center
        ${round === "champion" && team !== "" ? "flex-col gap-2" : "flex-row"} 
        ${teamBarClasses}`}
    >
      {/* Optional Champion Heading */}
      {round === "champion" && team !== "" && (
        <div
          className="uppercase font-bold"
          style={{
            color:
              team !== "playinGameSeed16Game1" &&
              team !== "playinGameSeed16Game2" &&
              team !== "playinGameSeed11Game1" &&
              team !== "playinGameSeed11Game2"
                ? NON_CTA_BUTTON_COLOR
                : "#000",
          }}
        >
          Champion
        </div>
      )}

      <div
        className={`flex justify-between items-center gap-2 leading-4
          ${round === "champion" ? "flex-col p-8 rounded-md" : "flex-row"} 
        `}
        style={{
          backgroundColor:
            round === "champion" && team !== ""
              ? NON_CTA_BUTTON_COLOR
              : "transparent",
          opacity: round === "champion" ? 1 : 1,
        }}
      >
        {/* Team Logo */}
        {isPlayin ||
          (team !== "" && (
            <div className="">
              <Image
                src={teamLogoPath}
                alt="Team Logo"
                width={round === "champion" ? 64 : 32}
                height={round === "champion" ? 64 : 32}
              />
            </div>
          ))}

        {/* Team Name and Playin Game Placeholders */}
        <div
          className={`${round && "text-center leading-6"} ${
            win && "font-bold"
          } ${teamBarNameClasses}`}
        >
          {isPlayin || team}

          {isPlayin &&
            team === "playinGameSeed11Game1" &&
            round !== "champion" &&
            `${playinTeamMatchups.elevenSeeds[0][0].team}/${playinTeamMatchups.elevenSeeds[0][1].team}`}
          {isPlayin &&
            team === "playinGameSeed11Game2" &&
            round !== "champion" &&
            `${playinTeamMatchups.elevenSeeds[1][0].team}/${playinTeamMatchups.elevenSeeds[1][1].team}`}
          {isPlayin &&
            team === "playinGameSeed16Game1" &&
            round !== "champion" &&
            `${playinTeamMatchups.sixteenSeeds[0][0].team}/${playinTeamMatchups.sixteenSeeds[0][1].team}`}
          {isPlayin &&
            team === "playinGameSeed16Game2" &&
            round !== "champion" &&
            `${playinTeamMatchups.sixteenSeeds[1][0].team}/${playinTeamMatchups.sixteenSeeds[1][1].team}`}

          {isPlayin &&
            team === "playinGameSeed11Game1" &&
            round === "champion" &&
            `${playinTeamMatchups.elevenSeeds[0][0].team}`}
          {isPlayin &&
            team === "playinGameSeed11Game2" &&
            round === "champion" &&
            `${playinTeamMatchups.elevenSeeds[1][0].team}`}
          {isPlayin &&
            team === "playinGameSeed16Game1" &&
            round === "champion" &&
            `${playinTeamMatchups.sixteenSeeds[0][0].team}`}
          {isPlayin &&
            team === "playinGameSeed16Game2" &&
            round === "champion" &&
            `${playinTeamMatchups.sixteenSeeds[1][0].team}`}

          {isPlayin && round === "champion" && <br />}
          {isPlayin && round === "champion" && "OR"}
          {isPlayin && round === "champion" && <br />}

          {isPlayin &&
            team === "playinGameSeed11Game2" &&
            round === "champion" &&
            `${playinTeamMatchups.elevenSeeds[1][1].team}`}
          {isPlayin &&
            team === "playinGameSeed11Game1" &&
            round === "champion" &&
            `${playinTeamMatchups.elevenSeeds[0][1].team}`}
          {isPlayin &&
            team === "playinGameSeed16Game1" &&
            round === "champion" &&
            `${playinTeamMatchups.sixteenSeeds[0][1].team}`}
          {isPlayin &&
            team === "playinGameSeed16Game2" &&
            round === "champion" &&
            `${playinTeamMatchups.sixteenSeeds[1][1].team}`}
        </div>
      </div>

      <div
        className={`${appState.regularSeason && "min-w-50"} ${
          win && "font-bold"
        }`}
      >
        {appState.regularSeason &&
          `${regularSeasonRecords[team]?.wins}-${regularSeasonRecords[team]?.losses}`}
        {appState.tournamentPlayGames && score}
      </div>

      {appState.selectionSunday &&
        (tournamentTeamsArr.includes(team) ||
          playinTeamsObj.elevenSeeds.includes(team) ||
          playinTeamsObj.sixteenSeeds.includes(team)) && (
          <PingNotification
            icon={regularSeasonRecords[team].confChampion ? "trophy" : "check"}
          />
        )}
    </div>
  );
};
