import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export function useMadnessPrep(yearId: string) {
  const { data: topPerformingTeams, isLoading: isLoadingMadnessPrep } =
    useQuery({
      queryKey: ["topPerformingTeams", yearId],
      queryFn: async () => {
        const response = await fetch(`/api/teams/top-performers/${yearId}`);
        if (!response.ok) {
          throw new AppError(
            "Failed to fetch top performing teams",
            response.status,
          );
        }
        return response.json() as Promise<TeamPerformanceSupabase[]>;
      },
      enabled: !!yearId,
    });

  return {
    topPerformingTeams,
    isLoadingMadnessPrep,
  };
}
