import type {
  PlayinSeedType,
  SeedRegion,
  TournamentRoundMatchups,
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
): TournamentRoundMatchups {
  const regions = {} as Record<SeedRegion, TournamentRoundMatchups[SeedRegion]>;
  SEED_REGIONS.forEach((region) => {
    const unordered = createMatchupsFromSeededArr(seeds[region]);
    regions[region] = ROUND_ONE_ORDER.map((index) => unordered[index]);
  });
  return {
    ...regions,
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
  } as TournamentRoundMatchups;
}
