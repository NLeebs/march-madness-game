import type { getTeamStatisticsByYearId } from "@/application/useCases";
import { useApiQuery, type ResultOf } from "./useApiQuery";

export function useTeamStatistics(yearId: string) {
  return useApiQuery<ResultOf<typeof getTeamStatisticsByYearId>>(
    ["teamStats", yearId],
    `/api/team-statistics/${yearId}`,
    "fetch team statistics",
    { enabled: !!yearId },
  );
}
