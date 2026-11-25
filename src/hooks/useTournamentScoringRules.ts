import type { TournamentScoringRulesResponse } from "@/application/useCases";
import { useApiQuery } from "./useApiQuery";

export function useTournamentScoringRules(yearId: string) {
  return useApiQuery<TournamentScoringRulesResponse>(
    ["tournamentScoringRuleId", yearId],
    `/api/tournament-scoring-rules/${yearId}`,
    "fetch tournament scoring rules",
    { enabled: !!yearId },
  );
}
