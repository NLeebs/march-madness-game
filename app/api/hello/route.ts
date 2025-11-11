import { NextResponse } from "next/server";
import {
  apiHandler,
  createSuccessResponse,
  ValidationError,
} from "@/utils/errorHandling";

// Handles GET requests to /api/hello
export const GET = apiHandler(async () => {
  return createSuccessResponse(
    { message: "Hello from Next.js 14 API!" },
    "Successfully retrieved greeting"
  );
}, "/api/hello");

// Handles POST requests to /api/hello
export const POST = apiHandler(async (req: Request) => {
  try {
    const body = await req.json();

    // Example validation
    if (!body || typeof body !== "object") {
      throw new ValidationError("Request body must be a valid JSON object");
    }

    return createSuccessResponse(
      { youSent: body },
      "Successfully processed request"
    );
  } catch (error) {
    // Re-throw to be caught by the global error handler
    throw error;
  }
}, "/api/hello");
