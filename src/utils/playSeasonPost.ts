import type { SeasonRequestBody } from "@/app/api/season/schema";
import type { PlaySeasonResult } from "@/application/useCases/season/PlaySeason";
import { apiError } from "./apiErrorReason";

/** Asks the server to play the regular season for the year; it answers with the season and a signed field token. */
export const playSeasonPost = async (body: SeasonRequestBody): Promise<PlaySeasonResult> => {
  const response = await fetch("/api/season", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await apiError(response, "play season");
  }
  return (await response.json()) as PlaySeasonResult;
};
