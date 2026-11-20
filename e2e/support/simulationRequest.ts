import { SimulationRequestSchema, type SimulationRequestBody } from "@/app/api/bracket/simulation/schema";
import type { ConferenceMap } from "@/models";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import { validateBracketPicks } from "@/src/functions/tournament/validateBracketPicks";
import type { TournamentPicks } from "@/types";
import type { ErrorResponse } from "@/utils/errorHandling/errorHandler";

const PATH = "/api/bracket/simulation";

export type ApiError = { status: number; body: ErrorResponse };

/** An error answer in the JSON shape handleApiError gives the route's errors. */
export function apiError(
  status: number,
  message: string,
  code?: string,
  details?: ErrorResponse["error"]["details"],
): ApiError {
  return {
    status,
    body: {
      success: false,
      error: {
        message,
        ...(code && { code }),
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: PATH,
        ...(details && { details }),
      },
    },
  };
}

/**
 * Checks a POST /api/bracket/simulation body the way the route and the
 * playTournament use case do: the strict request schema, every field team in
 * the served league, and picks consistent with the field's round one. So the
 * body the real UI builds must pass the real validation for an e2e game to go on.
 */
export function checkSimulationRequest(
  body: unknown,
  teamStats: ConferenceMap,
): { request: SimulationRequestBody } | { error: ApiError } {
  const parsed = SimulationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: apiError(
        400,
        "Request validation failed",
        "VALIDATION_ERROR",
        parsed.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      ),
    };
  }
  const request = parsed.data;
  const { tournamentTeams, playinTeams } = request.field;

  const known = new Set(Object.values(teamStats).flatMap((conference) => Object.keys(conference)));
  const unknown = [...tournamentTeams, ...playinTeams.elevenSeeds, ...playinTeams.sixteenSeeds].filter(
    (team) => !known.has(team),
  );
  if (unknown.length > 0) {
    return {
      error: apiError(400, `Field teams have no stats for this year: ${unknown.join(", ")}`),
    };
  }

  const roundOne = buildRoundOneMatchups(seedTournament(tournamentTeams), {
    elevenSeeds: playinTeams.elevenSeeds,
    sixteenSeeds: playinTeams.sixteenSeeds,
  });
  // cast: the schema's inferred types are looser than the game's (see playTournamentPost.ts).
  const problems = validateBracketPicks(roundOne, request.picks as TournamentPicks);
  if (problems.length > 0) {
    return { error: apiError(400, `Inconsistent picks: ${problems.join("; ")}`) };
  }
  return { request };
}
