import { YearSupabase } from "@/models/appStatsData";
import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { TeamStatsRepository } from "@/infrastructure/db/TeamStatsRepository";

export async function getYears(): Promise<Pick<YearSupabase, "id" | "year">[]> {
  const tournamentRepository = new TournamentRepository();
  const teamStatsRepository = new TeamStatsRepository();

  // allSettled, not all: when both loads fail, report the Supabase error
  // (the primary source) whichever one fails first.
  const [tournamentLoad, teamStatsLoad] = await Promise.allSettled([
    tournamentRepository.getYears(),
    teamStatsRepository.getYears(),
  ]);
  const tournamentYears = settled(tournamentLoad);
  const teamStatsYears = settled(teamStatsLoad);

  return tournamentYears.filter((year) =>
    teamStatsYears.includes(String(year.year))
  );
}

function settled<T>(result: PromiseSettledResult<T>): T {
  if (result.status === "rejected") throw result.reason;
  return result.value;
}
