import type {
  PlayinSeedType,
  RoundOneMatchups,
  SeedRegion,
  TournamentMatchup,
} from "@/types";
import { createMatchupsFromSeededArr } from "@/src/functions/seeding/createMatchupsFromSeededArr";
import { SEED_REGIONS } from "./roundConfig";

/** Bracket order of the eight round-one games, as indexes into the 1v16, 2v15, ... pairing. */
const ROUND_ONE_ORDER = [0, 7, 4, 3, 5, 2, 6, 1] as const;

const PLAYIN_SEED_NUMBER: Record<PlayinSeedType, number> = {
  elevenSeeds: 11,
  sixteenSeeds: 16,
};

/** Pairs each region's seeded array into round-one games (bracket order) and pairs the play-in teams. */
export function buildRoundOneMatchups(
  seeds: Readonly<Record<SeedRegion, readonly string[]>>,
  playinTeams: Readonly<Record<PlayinSeedType, readonly string[]>>
): RoundOneMatchups {
  const inBracketOrder = (region: SeedRegion): TournamentMatchup[] => {
    const unordered = createMatchupsFromSeededArr(seeds[region]);
    return ROUND_ONE_ORDER.map((index) => unordered[index]);
  };
  return {
    west: inBracketOrder("west"),
    east: inBracketOrder("east"),
    south: inBracketOrder("south"),
    midwest: inBracketOrder("midwest"),
    playin: {
      elevenSeeds: createMatchupsFromSeededArr(
        playinTeams.elevenSeeds,
        PLAYIN_SEED_NUMBER.elevenSeeds
      ),
      sixteenSeeds: createMatchupsFromSeededArr(
        playinTeams.sixteenSeeds,
        PLAYIN_SEED_NUMBER.sixteenSeeds
      ),
    },
  };
}
