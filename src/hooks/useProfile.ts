import type { getUserProfile } from "@/application/useCases";
import { useApiQuery, type ResultOf } from "./useApiQuery";

export function useProfile(userId: string | undefined) {
  return useApiQuery<ResultOf<typeof getUserProfile>>(
    ["profile", userId],
    `/api/profile/${userId}`,
    "fetch user profile",
    { enabled: !!userId },
  );
}
