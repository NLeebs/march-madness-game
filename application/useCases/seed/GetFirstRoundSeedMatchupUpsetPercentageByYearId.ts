import { SeedRepository } from "@/infrastructure/db/SeedRepository";
import { SeedPerformanceSupabase } from "@/models/appStatsData";

export async function getFirstRoundSeedMatchupUpsetPercentageByYearId(
  yearId: string,
): Promise<SeedPerformanceSupabase[]> {
  const seedRepository = new SeedRepository();
  const firstRoundSeedMatchupUpsetPercentages =
    await seedRepository.getFirstRoundSeedMatchupUpsetPercentagesByYearId(
      yearId,
    );
  return firstRoundSeedMatchupUpsetPercentages;
}
