import { YearSupabase } from "@/models/appStatsData";
import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";

export async function getYears(): Promise<YearSupabase[]> {
  const repository = new TournamentRepository();
  return repository.getYears();
}
