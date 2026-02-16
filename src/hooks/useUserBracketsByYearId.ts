import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";

export function useUserBracketsByYearId(userId: string, yearId: string) {
  return useQuery({
    queryKey: ["userBracketsByYearId", userId, yearId],
    queryFn: async () => {
      const response = await fetch(`/api/brackets/${userId}/${yearId}`);
      if (!response.ok) {
        throw new AppError(
          "Failed to fetch user brackets by year id",
          response.status,
        );
      }
      return response.json();
    },
    enabled: !!userId && !!yearId,
  });
}
