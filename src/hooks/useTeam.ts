import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";

export function useTeam(id: string) {
  return useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const response = await fetch(`/api/team/${id}`);
      if (!response.ok) {
        throw new AppError("Failed to fetch team", response.status);
      }
      return response.json();
    },
    enabled: !!id,
  });
}
