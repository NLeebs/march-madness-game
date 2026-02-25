import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";

export function useTournamentScoringRules(yearId: string) {
  return useQuery({
    queryKey: ["tournamentScoringRuleId", yearId],
    queryFn: async () => {
      const response = await fetch(
        `/api/tournament-scoring-rules/${yearId}`
      );
      if (!response.ok) {
        throw new AppError(
          "Failed to fetch tournament scoring rules",
          response.status
        );
      }
      return response.json();
    },
    enabled: !!yearId,
  });
}
