"use client"
// Libraries
import React from "react";
// React Functions
import { useSelector } from "react-redux";
// Functions
import findTeamConference from "@/src/functions/teamStatsData/findTeamConference";
// CSS styles
import classes from './TeamBar.module.css';
// Icons
import { TrophyIcon } from '@heroicons/react/24/solid'
import { CheckIcon } from '@heroicons/react/24/solid'
// Components
import Image from "next/image";
// Constants
import { NON_CTA_BUTTON_COLOR } from "@/constants/CONSTANTS";


// Component Function
function TeamBar(props) {
  const appState = useSelector((state) => state.appState);
  const teamStats = useSelector((state) => state.teamStats.teamStats);
  const confArrs = useSelector((state) => state.teamStats.conferenceArrays);
  const regularSeasonRecords = useSelector((state) => state.regularSeasonRecords.records);
  const tournamentTeamsArr = useSelector((state) => state.tournament.tournamentTeams);
  const playinTeamMatchups = useSelector((state) => state.tournament.roundOneMatchups.playin)
  const playinTeamsObj = useSelector((state) => state.tournament.playinTeams);

  // Find conference of the team
  const teamConf = findTeamConference(props.team, confArrs);

  // Check if this is a playin Game and pull logo for non-playin games
  let isPlayin;
  let teamLogoPath;
  if (props.team === "playinGameSeed11Game1" || props.team === "playinGameSeed11Game2" || props.team === "playinGameSeed16Game1" || props.team === "playinGameSeed16Game2") {
      isPlayin = true;
  } else if (props.team !== "") {
      isPlayin = false;
      teamLogoPath = teamStats[teamConf][props.team].logo;
  }

  // Dynamic Styles
  let teamBarClasses, teamBarNameClasses = "";
  if(appState.selectionSunday  && (tournamentTeamsArr.includes(props.team) || playinTeamsObj.elevenSeeds.includes(props.team) || playinTeamsObj.sixteenSeeds.includes(props.team))) teamBarClasses = `animate-pulse`;

  // Champion Styles
  if (props.round === "champion") {
    // console.log("Hello!");
  }

  return (
    <div 
      className={`w-full relative flex justify-between items-center
        ${props.round === "champion" && props.team !== "" ? "flex-col gap-2" : "flex-row"} 
        ${teamBarClasses}`}
    >

      {/* Optional Champion Heading */}
      {props.round === "champion" && props.team !== "" &&
        <div 
          className="uppercase font-bold"
          style={{
            color: props.team !== "playinGameSeed16Game1" && props.team !== "playinGameSeed16Game2" && props.team !== "playinGameSeed11Game1" && props.team !== "playinGameSeed11Game2" ? NON_CTA_BUTTON_COLOR : "#000"}}
        >
          Champion
        </div>
      }

      <div 
        className={`flex justify-between items-center gap-2 leading-4
          ${props.round === "champion" ? "flex-col p-8 rounded-md" : "flex-row" } 
        `}
        style={{
          backgroundColor: props.round === "champion" && props.team !== "" ? NON_CTA_BUTTON_COLOR : "transparent",
          opacity: props.round === "champion" ? 1 : 1,
        }}
      >

        {/* Team Logo */}
        {isPlayin || props.team !== "" &&
          <div className="">
            <Image src={teamLogoPath} alt="Team Logo" width={props.round === "champion" ? 64 : 32} height={props.round === "champion" ? 64 : 32} />
          </div>
        }

        {/* Team Name and Playin Game Placeholders */}
        <div className={`${props.round && "text-center leading-6"} ${props.win && "font-bold"} ${teamBarNameClasses}`}> 
          {/* Non-playin team name */}
          {isPlayin || props.team} 

          {/* Playin Game Placeholder - Not Champion Round */}
          {isPlayin && props.team === "playinGameSeed11Game1" && props.round !== "champion" && `${playinTeamMatchups.elevenSeeds[0][0].team}/${playinTeamMatchups.elevenSeeds[0][1].team}`} 
          {isPlayin && props.team === "playinGameSeed11Game2" && props.round !== "champion" && `${playinTeamMatchups.elevenSeeds[1][0].team}/${playinTeamMatchups.elevenSeeds[1][1].team}`} 
          {isPlayin && props.team === "playinGameSeed16Game1" && props.round !== "champion" && `${playinTeamMatchups.sixteenSeeds[0][0].team}/${playinTeamMatchups.sixteenSeeds[0][1].team}`} 
          {isPlayin && props.team === "playinGameSeed16Game2" && props.round !== "champion" && `${playinTeamMatchups.sixteenSeeds[1][0].team}/${playinTeamMatchups.sixteenSeeds[1][1].team}`} 

          {/* Playin Game Placeholder - Champion Round */}
          {isPlayin && props.team === "playinGameSeed11Game1" && props.round === "champion" && `${playinTeamMatchups.elevenSeeds[0][0].team}`} 
          {isPlayin && props.team === "playinGameSeed11Game2" && props.round === "champion" && `${playinTeamMatchups.elevenSeeds[1][0].team}`} 
          {isPlayin && props.team === "playinGameSeed16Game1" && props.round === "champion" && `${playinTeamMatchups.sixteenSeeds[0][0].team}`} 
          {isPlayin && props.team === "playinGameSeed16Game2" && props.round === "champion" && `${playinTeamMatchups.sixteenSeeds[1][0].team}`} 

          {isPlayin && props.round === "champion" && <br/>}
          {isPlayin && props.round === "champion" && "OR"}
          {isPlayin && props.round === "champion" && <br/>}

          {isPlayin && props.team === "playinGameSeed11Game2" && props.round === "champion" && `${playinTeamMatchups.elevenSeeds[1][1].team}`} 
          {isPlayin && props.team === "playinGameSeed11Game1" && props.round === "champion" && `${playinTeamMatchups.elevenSeeds[0][1].team}`} 
          {isPlayin && props.team === "playinGameSeed16Game1" && props.round === "champion" && `${playinTeamMatchups.sixteenSeeds[0][1].team}`} 
          {isPlayin && props.team === "playinGameSeed16Game2" && props.round === "champion" && `${playinTeamMatchups.sixteenSeeds[1][1].team}`} 
        </div>
          
      </div>
        
      {/* Regular Season Records and Tournament Scores */}
      <div className={`${appState.regularSeason && "min-w-50"} ${props.win && "font-bold"}`}>
        {appState.regularSeason && `${regularSeasonRecords[props.team]?.wins}-${regularSeasonRecords[props.team]?.losses}`}
        {appState.tournamentPlayGames && props.score}
      </div>

      {/* Selection Sunday Notification */}
      {appState.selectionSunday  && (tournamentTeamsArr.includes(props.team) || playinTeamsObj.elevenSeeds.includes(props.team) || playinTeamsObj.sixteenSeeds.includes(props.team)) &&
        <div className="absolute flex justify-center items-center p-1 -top-2 -right-2 bg-green-700 rounded-full">
          {regularSeasonRecords[props.team].confChampion === true ? <TrophyIcon className="h-4 w-4 text-slate-50" /> : <CheckIcon className="h-4 w-4 text-slate-50" />}
        </div>
      }

    </div>
  );
}

export default TeamBar;