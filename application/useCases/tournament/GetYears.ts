import { YearSupabase } from "@/models/appStatsData";
import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { TeamStatsRepository } from "@/infrastructure/db/TeamStatsRepository";

export async function getYears(): Promise<YearSupabase[]> {
  const tournamentRepository = new TournamentRepository();
  const teamStatsRepository = new TeamStatsRepository();

  const tournamentYears = await tournamentRepository.getYears();
  const teamStatsYears = await teamStatsRepository.getYears();

  return tournamentYears.filter((year) =>
    teamStatsYears.includes(String(year.year))
  );
}
