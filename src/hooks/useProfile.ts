import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const response = await fetch(`/api/profile/${userId}`);
      if (!response.ok) {
        throw new AppError("Failed to fetch user profile", response.status);
      }
      return response.json();
    },
    enabled: !!userId,
  });
}
