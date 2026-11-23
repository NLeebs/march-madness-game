import type { PlayTournamentRequest, PlayTournamentResult } from "@/types";
import { apiError } from "./apiErrorReason";

/** Sends the signed field token and picks; the server plays, scores and saves the tournament. */
export const playTournamentPost = async (
  body: PlayTournamentRequest,
): Promise<PlayTournamentResult> => {
  const response = await fetch("/api/bracket/simulation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await apiError(response, "play tournament");
  }
  return (await response.json()) as PlayTournamentResult;
};
