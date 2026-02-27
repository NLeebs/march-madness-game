import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { RoundSupabase } from "@/models/appStatsData";

export async function getRounds(): Promise<RoundSupabase[]> {
  const tournamentRepository = new TournamentRepository();
  const rounds = await tournamentRepository.getRounds();
  return rounds;
}
