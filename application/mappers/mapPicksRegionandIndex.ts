import { TournamentRegion, TournamentRound } from "@/types";

export const mapPicksRegionAndIndex = (
  roundName: TournamentRound,
  matchupRegion: TournamentRegion
): { picksRegion: TournamentRegion; pickIndex: number } => {
  if (roundName === "elite eight") {
    if (matchupRegion === "east" || matchupRegion === "west") {
      return {
        picksRegion: "eastWest",
        pickIndex: matchupRegion === "east" ? 1 : 0,
      };
    } else if (matchupRegion === "south" || matchupRegion === "midwest") {
      return {
        picksRegion: "southMidwest",
        pickIndex: matchupRegion === "south" ? 0 : 1,
      };
    }
  }

  if (roundName === "final four") {
    return {
      picksRegion: "championship",
      pickIndex: matchupRegion === "eastWest" ? 0 : 1,
    };
  }

  if (roundName === "finals") {
    return {
      picksRegion: "champion",
      pickIndex: 0,
    };
  }

  return {
    picksRegion: matchupRegion,
    pickIndex: 0,
  };
};
