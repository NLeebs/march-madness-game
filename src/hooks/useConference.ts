import type { getConferenceById } from "@/application/useCases";
import { useApiQuery, type ResultOf } from "./useApiQuery";

export function useConference(id: string) {
  return useApiQuery<ResultOf<typeof getConferenceById>>(
    ["conference", id],
    `/api/conference/${id}`,
    "fetch conference",
    { enabled: !!id },
  );
}
