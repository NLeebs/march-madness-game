import { apiError } from "./apiErrorReason";

/**
 * GETs an API route and returns its JSON body as T. A non-ok response throws
 * an AppError carrying the server's reason ("Failed to <action> (<status>): ...").
 */
export async function apiGet<T>(path: string, action: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw await apiError(response, action);
  }
  return (await response.json()) as T;
}
