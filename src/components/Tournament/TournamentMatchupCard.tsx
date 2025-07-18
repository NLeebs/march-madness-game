import React from "react";
import { useSelector } from "react-redux";
import { TournamentMatchup, TournamentRound, TournamentTeam } from "@/types";
import { RootState } from "@/store";
import { PlayerPickBar, TeamBar } from "@/src/components";
import { motion } from "framer-motion";
import classes from "@/src/components/Tournament/css/TournamentMatchup.module.css";

interface TournamentMatchupCardProps {
  round: TournamentRound | "playin";
  matchup: TournamentMatchup;
  matchupIndex: number;
  matchupTeam: TournamentTeam;
  teamBarHeight: string;
  teamBarColor: string;
  teamClickHandler: (e: React.MouseEvent<HTMLElement>) => void;
  playerPicks: any;
}

export const TournamentMatchupCard: React.FC<TournamentMatchupCardProps> = ({
  round,
  matchup,
  matchupIndex,
  matchupTeam,
  teamBarHeight,
  teamBarColor,
  teamClickHandler,
  playerPicks,
}) => {
  const appState = useSelector((state: RootState) => state.appState);

  return (
    <motion.div
      key={matchupIndex}
      className={`relative z-10
                ${
                  round === "champion" && matchup[0].team
                    ? "flex justify-center items-center"
                    : ""
                }
                    `}
      onClick={appState.tournamentSelection ? teamClickHandler : undefined}
      data-value={matchupIndex}
      data-team={matchupTeam.team}
      data-seed={matchupTeam.seed}
      initial={{
        height: "auto",
        backgroundColor: teamBarColor,
      }}
      animate={{
        height: teamBarHeight,
        backgroundColor: teamBarColor,
      }}
    >
      {(appState.tournamentPlayPlayinGames || appState.tournamentPlayGames) &&
        round !== "playin" &&
        round !== 1 &&
        matchupIndex % 2 === 0 && (
          <PlayerPickBar
            round={round}
            team={matchupTeam.team}
            pick={playerPicks[matchupIndex]?.team}
          />
        )}

      <button
        onClick={appState.tournamentSelection ? teamClickHandler : undefined}
        data-value={matchupIndex}
        data-team={matchupTeam.team}
        data-seed={matchupTeam.seed}
        className={`team-selection w-full flex items-center px-4 h-14 bg-transparent
            ${
              round === "champion" && matchup[0].team
                ? ""
                : "border-2 border-slate-100"
            } 
                ${round === "playin" && "min-w-300"}`}
      >
        {round !== "champion" && (
          <div className="flex justify-center items-center w-6 pr-2">
            {matchupTeam.seed}
          </div>
        )}

        <TeamBar
          round={round}
          team={matchupTeam.team}
          win={matchupTeam?.win}
          score={matchupTeam?.score}
        />
      </button>

      {(appState.tournamentPlayPlayinGames || appState.tournamentPlayGames) &&
        round !== "playin" &&
        round !== 1 &&
        matchupIndex % 2 === 1 && (
          <PlayerPickBar
            round={round}
            team={matchupTeam.team}
            pick={playerPicks[matchupIndex]?.team}
          />
        )}

      {round === "champion" && matchup[0].team && (
        <motion.div
          className={classes.championRibbon}
          initial={{
            borderTopColor: teamBarColor,
          }}
          animate={{
            borderTopColor: teamBarColor,
          }}
        ></motion.div>
      )}
    </motion.div>
  );
};
