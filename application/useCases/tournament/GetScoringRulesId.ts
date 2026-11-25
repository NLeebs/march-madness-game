import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";

export async function getScoringRuleIdByYearId(
  yearId: string
): Promise<string> {
  const tournamentRepository = new TournamentRepository();

  const bracketScoringRule =
    await tournamentRepository.getBracketScoringRulesByYearId(yearId);

  return bracketScoringRule.id;
}

/** Body of `GET /api/tournament-scoring-rules/[yearId]`: the route wraps the use case's id. */
export type TournamentScoringRulesResponse = {
  tournamentScoringRuleId: Awaited<ReturnType<typeof getScoringRuleIdByYearId>>;
  message: string;
};
