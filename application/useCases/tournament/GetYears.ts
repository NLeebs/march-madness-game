import { YearSupabase } from "@/models/appStatsData";
import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { TeamStatsRepository } from "@/infrastructure/db/TeamStatsRepository";

export async function getYears(): Promise<Pick<YearSupabase, "id" | "year">[]> {
  const tournamentRepository = new TournamentRepository();
  const teamStatsRepository = new TeamStatsRepository();

  const [tournamentYears, teamStatsYears] = await Promise.all([
    tournamentRepository.getYears(),
    teamStatsRepository.getYears(),
  ]);

  return tournamentYears.filter((year) =>
    teamStatsYears.includes(String(year.year))
  );
}
