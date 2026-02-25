import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";

export function useConference(id: string) {
  return useQuery({
    queryKey: ["conference", id],
    queryFn: async () => {
      const response = await fetch(`/api/conference/${id}`);
      if (!response.ok) {
        throw new AppError("Failed to fetch conference", response.status);
      }
      return response.json();
    },
    enabled: !!id,
  });
}
