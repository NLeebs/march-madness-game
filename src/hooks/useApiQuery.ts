import { useQuery, type QueryKey, type UseQueryResult } from "@tanstack/react-query";
import { apiGet } from "@/src/utils";

/**
 * The resolved return type of a use case, for typing what its API route sends.
 * Import the use case with `import type` so no server code reaches the client.
 */
export type ResultOf<F extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<F>>;

/** useQuery over apiGet: fetches `path` under `queryKey`; a failure carries the server's reason. */
export function useApiQuery<T>(
  queryKey: QueryKey,
  path: string,
  action: string,
  options: { enabled?: boolean } = {},
): UseQueryResult<T, Error> {
  return useQuery<T>({
    queryKey,
    queryFn: () => apiGet<T>(path, action),
    enabled: options.enabled ?? true,
  });
}
