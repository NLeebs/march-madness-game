import type { getYears } from "@/application/useCases";
import { useApiQuery, type ResultOf } from "./useApiQuery";

export function useYears() {
  return useApiQuery<ResultOf<typeof getYears>>(
    ["years"],
    "/api/years",
    "fetch years",
  );
}
