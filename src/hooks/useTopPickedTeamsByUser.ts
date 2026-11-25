import type { getTopPickedTeamsByUserIdAndYearId } from "@/application/useCases";
import { useApiQuery, type ResultOf } from "./useApiQuery";

export function useTopPickedTeamsByUser(userId: string, yearId: string) {
  return useApiQuery<ResultOf<typeof getTopPickedTeamsByUserIdAndYearId>>(
    ["topPickedTeamsByUser", userId, yearId],
    `/api/pick-count/${userId}/${yearId}`,
    "fetch top picked teams by user",
    { enabled: !!userId && !!yearId },
  );
}
