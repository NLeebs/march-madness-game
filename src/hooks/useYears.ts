import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";

export function useYears() {
  return useQuery({
    queryKey: ["years"],
    queryFn: async () => {
      const response = await fetch("/api/years");
      if (!response.ok) {
        throw new AppError("Failed to fetch years", response.status);
      }
      return response.json();
    },
  });
}
