import { NextRequest, NextResponse } from "next/server";
import { playTournament } from "@/application/useCases";
import type { TournamentField } from "@/src/functions/tournament/simulateTournament";
import { handleApiError } from "@/utils/errorHandling/errorHandler";
import {
  validateRequest,
  validateMethod,
  validateContentType,
  rateLimit,
  validateOrigin,
  combineMiddleware,
} from "@/utils/errorHandling";
import { getAllowedOrigins } from "@/utils/api/allowedOrigins";
import { getSessionUserId } from "@/utils/api/getSessionUserId";
import { TournamentState } from "@/store/tournamentSlice";
import { TournamentPlayerPicks, TournamentPicks } from "@/types";
import { SimulationRequestSchema } from "./schema";

/**
 * Legacy request shape (browser-computed tournament). Still imported by the
 * client persist path and e2e fake backend until a later task removes them.
 */
export interface SimulationRequestBody {
  tournamentState: TournamentState;
  picksState: TournamentPlayerPicks;
  userId?: string | null;
  anonUserId?: string | null;
}

const securityMiddleware = combineMiddleware(
  validateMethod(["POST"]),
  validateContentType(["application/json"]),
  validateOrigin(getAllowedOrigins(), true),
  rateLimit(20, 60000),
);

export async function POST(req: NextRequest) {
  try {
    await securityMiddleware(req);

    const body = await validateRequest(SimulationRequestSchema)(req);

    // The session decides who owns the bracket; the body's anonUserId only
    // counts for logged-out players.
    const userId = await getSessionUserId();
    const anonUserId = userId ? null : (body.anonUserId ?? null);

    const result = await playTournament({
      yearId: body.yearId,
      // The schema guarantees these shapes; zod's inference with
      // strict: false marks every key optional, so assert them.
      field: body.field as TournamentField,
      picks: body.picks as TournamentPicks,
      userId,
      anonUserId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error, "/api/bracket/simulation");
  }
}
