import type { getTeamById } from "@/application/useCases";
import { useApiQuery, type ResultOf } from "./useApiQuery";

export function useTeam(id: string) {
  return useApiQuery<ResultOf<typeof getTeamById>>(
    ["team", id],
    `/api/team/${id}`,
    "fetch team",
    { enabled: !!id },
  );
}
