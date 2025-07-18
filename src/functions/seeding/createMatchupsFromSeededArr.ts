import { TournamentMatchup } from "@/types";

export const createMatchupsFromSeededArr = (
  seededArr: string[],
  playinSeed = false
): TournamentMatchup[] => {
  const matchupArr = [];
  for (let i = 0; i < seededArr.length / 2; i++) {
    matchupArr.push([
      {
        team: seededArr[i],
        seed: playinSeed || i + 1,
      },
      {
        team: seededArr[seededArr.length - (i + 1)],
        seed: playinSeed || seededArr.length - i,
      },
    ]);
  }

  return matchupArr;
};
