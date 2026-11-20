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
import type { TournamentPicks } from "@/types";
import { SimulationRequestSchema } from "./schema";

const securityMiddleware = combineMiddleware(
  validateMethod(["POST"]),
  validateContentType(["application/json"]),
  validateOrigin(getAllowedOrigins(), true),
  // Per IP, per server instance. A player sends one request per game, and an
  // over-limit request ends their game, so leave room for shared networks.
  rateLimit(60, 60000),
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
      // cast: the schema guarantees these shapes; zod's inference with
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
