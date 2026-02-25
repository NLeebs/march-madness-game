import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";

export function useTopPickedTeamsByUser(userId: string, yearId: string) {
  return useQuery({
    queryKey: ["topPickedTeamsByUser", userId, yearId],
    queryFn: async () => {
      const response = await fetch(`/api/pick-count/${userId}/${yearId}`);
      if (!response.ok) {
        throw new AppError(
          "Failed to fetch top picked teams by user",
          response.status,
        );
      }
      return response.json();
    },
    enabled: !!userId && !!yearId,
  });
}
