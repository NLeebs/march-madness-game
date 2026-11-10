import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { RoundSupabase } from "@/models/appStatsData";

export async function getRounds(): Promise<Pick<RoundSupabase, "id" | "round_name">[]> {
  const tournamentRepository = new TournamentRepository();
  const rounds = await tournamentRepository.getRounds();
  return rounds;
}
