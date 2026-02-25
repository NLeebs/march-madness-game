import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";

export function useTeamStatistics(yearId: string) {
  return useQuery({
    queryKey: ["teamStats", yearId],
    queryFn: async () => {
      const response = await fetch(`/api/team-statistics/${yearId}`);
      if (!response.ok) {
        throw new AppError(
          "Failed to fetch team statistics",
          response.status
        );
      }
      return response.json();
    },
    enabled: !!yearId,
  });
}
