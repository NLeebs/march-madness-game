import { NextRequest, NextResponse } from "next/server";
import { playSeason } from "@/application/useCases";
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
import { SeasonRequestSchema } from "./schema";

const securityMiddleware = combineMiddleware(
  validateMethod(["POST"]),
  validateContentType(["application/json"]),
  validateOrigin(getAllowedOrigins(), true),
  // Per IP, per server instance; same limit as the tournament route.
  rateLimit(60, 60000),
);

export async function POST(req: NextRequest) {
  try {
    await securityMiddleware(req);

    const body = await validateRequest(SeasonRequestSchema)(req);

    const result = await playSeason({ yearId: body.yearId as string });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error, "/api/season");
  }
}
