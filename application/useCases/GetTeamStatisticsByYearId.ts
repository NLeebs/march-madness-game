import { TeamStatsRepository } from "@/infrastructure/db/TeamStatsRepository";
import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { ConferenceMap } from "@/models";

export async function getTeamStatisticsByYearId(
  yearId: string
): Promise<ConferenceMap> {
  const tournamentRepository = new TournamentRepository();
  const teamStatsRepository = new TeamStatsRepository();

  const {year} = await tournamentRepository.getYearById(yearId);
  const teamStats = await teamStatsRepository.getTeamStatsByYearId(year);
  return teamStats;
}
