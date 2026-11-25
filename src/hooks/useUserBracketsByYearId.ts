import type { getUserBracketsByYearId } from "@/application/useCases";
import { useApiQuery, type ResultOf } from "./useApiQuery";

export function useUserBracketsByYearId(userId: string, yearId: string) {
  return useApiQuery<ResultOf<typeof getUserBracketsByYearId>>(
    ["userBracketsByYearId", userId, yearId],
    `/api/brackets/${userId}/${yearId}`,
    "fetch user brackets by year id",
    { enabled: !!userId && !!yearId },
  );
}
