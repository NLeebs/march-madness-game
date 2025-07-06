import { GameResult, TournamentGameResult, TournamentRegion } from "@/types";

export const getTournamentGameResultObj = (
  resultObj: GameResult,
  gameIndex: number,
  region: TournamentRegion | null = null
): TournamentGameResult => {
  let winningTeam: string;
  let winningScore: number;
  let losingScore: number;

  if (resultObj.favoredScore > resultObj.underdogScore) {
    winningTeam = resultObj.favoredTeam;
    winningScore = resultObj.favoredScore;
    losingScore = resultObj.underdogScore;
  } else {
    winningTeam = resultObj.underdogTeam;
    winningScore = resultObj.underdogScore;
    losingScore = resultObj.favoredScore;
  }

  return {
    region,
    gameIndex,
    winningTeam,
    winningScore,
    losingScore,
  };
};
