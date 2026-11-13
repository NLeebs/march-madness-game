import type { SeedRegion } from "@/types";
import { HIGHEST_SEED } from "@/src/constants/CONSTANTS";
import { PLAYIN_PLACEHOLDERS, SEED_REGIONS } from "./roundConfig";

/**
 * Deals the selected field into the four regions, seed line by seed line.
 * `tournamentTeams` holds the 60 non-play-in teams in rank order; the play-in
 * slots (the two 11 seeds in south/midwest, the two 16 seeds in west/east) get
 * placeholder names that the play-in games later replace.
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
  const seedSettingArr = [...tournamentTeams];
  const numberOfRegions = SEED_REGIONS.length;
  for (let i = 1; i <= HIGHEST_SEED; i++) {
    for (let j = 0; j < numberOfRegions; j++) {
      const region = SEED_REGIONS[j];
      if (i % 2 === 1) {
        if (i === 11 && (j === 2 || j === 3)) {
          seeds[region].push(PLAYIN_PLACEHOLDERS.elevenSeeds[j - 2]);
          seedSettingArr.splice(j, 0, "PlayinTeam");
        } else seeds[region].push(seedSettingArr[j]);
      } else {
        if (i === 16 && (j === 0 || j === 1)) {
          seeds[region].push(PLAYIN_PLACEHOLDERS.sixteenSeeds[j]);
        } else seeds[region].push(seedSettingArr[numberOfRegions - (j + 1)]);
      }
    }
    seedSettingArr.splice(0, 4);
  }
  return seeds;
}
