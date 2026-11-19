import type { SimulationRequestBody } from "@/app/api/bracket/simulation/schema";
import type { PlayTournamentResult } from "@/application/useCases/tournament/PlayTournament";
import type { TournamentField } from "@/src/functions/tournament/simulateTournament";
import type { TournamentPicks } from "@/types";
import { AppError } from "@/utils/errorHandling";

/**
 * The route's request body with the game's own field and picks types: under
 * strict: false, zod infers picks matchups as tuples that TournamentPicks does
 * not satisfy (the route casts the other way, see route.ts).
 */
export type PlayTournamentRequest = Omit<SimulationRequestBody, "field" | "picks"> & {
  field: TournamentField;
  picks: TournamentPicks;
};

/** Sends the field and picks; the server plays, scores and saves the tournament. */
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
    throw new AppError("Failed to play tournament", response.status);
  }
  return (await response.json()) as PlayTournamentResult;
};
