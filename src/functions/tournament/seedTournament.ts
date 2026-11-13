import type { PlayinSeedType, SeedRegion } from "@/types";
import { HIGHEST_SEED } from "@/src/constants/CONSTANTS";
import {
  PLAYIN_PLACEHOLDERS,
  PLAYIN_ROUND_ONE_SLOTS,
  SEED_REGIONS,
} from "./roundConfig";

const PLAYIN_SEED_LINES: Readonly<Record<number, PlayinSeedType>> = {
  11: "elevenSeeds",
  16: "sixteenSeeds",
};

/** Placeholder name for `region` on seed line `seed`, or undefined when that slot holds a real team. */
function placeholderFor(seed: number, region: SeedRegion): string | undefined {
  const seedType = PLAYIN_SEED_LINES[seed];
  if (!seedType) return undefined;
  const index = PLAYIN_ROUND_ONE_SLOTS[seedType].findIndex(
    (slot) => slot.region === region
  );
  return index === -1 ? undefined : PLAYIN_PLACEHOLDERS[seedType][index];
}

/**
 * Deals the selected field into the four regions, seed line by seed line,
 * snaking (odd lines west -> midwest, even lines midwest -> west).
 * `tournamentTeams` holds the 60 non-play-in teams in rank order; the play-in
 * slots (the regions `PLAYIN_ROUND_ONE_SLOTS` names on the 11 and 16 lines)
 * get placeholder names that the play-in games later replace, and the real
 * teams on that line go to the other regions in snake order.
 */
export function seedTournament(
  tournamentTeams: readonly string[]
): Record<SeedRegion, string[]> {
  const seeds: Record<SeedRegion, string[]> = {
    west: [],
    east: [],
    south: [],
    midwest: [],
  };
  let next = 0;
  for (let seed = 1; seed <= HIGHEST_SEED; seed++) {
    const regions =
      seed % 2 === 1 ? SEED_REGIONS : [...SEED_REGIONS].reverse();
    const line: Partial<Record<SeedRegion, string>> = {};
    regions.forEach((region) => {
      line[region] = placeholderFor(seed, region) ?? tournamentTeams[next++];
    });
    SEED_REGIONS.forEach((region) => seeds[region].push(line[region]));
  }
  return seeds;
}
