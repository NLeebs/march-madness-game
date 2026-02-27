import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";

export async function getScoringRuleIdByYearId(
  yearId: string
): Promise<string> {
  const tournamentRepository = new TournamentRepository();

  const bracketScoringRule =
    await tournamentRepository.getBracketScoringRulesByYearId(yearId);

  return bracketScoringRule.id;
}
