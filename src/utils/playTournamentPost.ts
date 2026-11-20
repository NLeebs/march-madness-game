import type { SimulationRequestBody } from "@/app/api/bracket/simulation/schema";
import type { PlayTournamentResult } from "@/application/useCases/tournament/PlayTournament";
import type { TournamentPicks } from "@/types";
import { apiError } from "./apiErrorReason";

/**
 * The route's request body with the game's own picks type: under
 * strict: false, zod infers picks matchups as tuples that TournamentPicks does
 * not satisfy (the route casts the other way, see route.ts).
 */
export type PlayTournamentRequest = Omit<SimulationRequestBody, "picks"> & {
  picks: TournamentPicks;
};

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
