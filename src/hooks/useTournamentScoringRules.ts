import type { getScoringRuleIdByYearId } from "@/application/useCases";
import { useApiQuery, type ResultOf } from "./useApiQuery";

/** The scoring-rules route wraps the use case's id (it does not return it bare). */
type TournamentScoringRulesResponse = {
  tournamentScoringRuleId: ResultOf<typeof getScoringRuleIdByYearId>;
  message: string;
};

export function useTournamentScoringRules(yearId: string) {
  return useApiQuery<TournamentScoringRulesResponse>(
    ["tournamentScoringRuleId", yearId],
    `/api/tournament-scoring-rules/${yearId}`,
    "fetch tournament scoring rules",
    { enabled: !!yearId },
  );
}
