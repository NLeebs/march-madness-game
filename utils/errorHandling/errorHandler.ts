import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./AppError";

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    details?: any;
  };
}

interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export function handleApiError(
  error: unknown,
  path?: string
): NextResponse<ErrorResponse> {
  console.error("API Error:", error);

  let statusCode = 500;
  let message = "Internal server error";
  let code: string | undefined;
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation error";
    code = "VALIDATION_ERROR";
    details = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
      code: err.code,
    }));
  } else if (error instanceof SyntaxError && "body" in error) {
    statusCode = 400;
    message = "Invalid JSON in request body";
    code = "INVALID_JSON";
  } else if (error instanceof TypeError && error.message.includes("fetch")) {
    statusCode = 503;
    message = "External service unavailable";
    code = "EXTERNAL_SERVICE_ERROR";
  } else if (error instanceof Error) {
    message = error.message;
    code = "UNKNOWN_ERROR";
  }

  if (process.env.NODE_ENV === "development") {
    console.error("Error details:", {
      message,
      code,
      statusCode,
      path,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      path,
      ...(details && { details }),
    },
  };

  return NextResponse.json(errorResponse, { status: statusCode });
}

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };

  return NextResponse.json(response, { status });
}

export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  path?: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, path);
    }
  };
}

export function apiHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  path?: string
) {
  return withErrorHandling(handler, path);
}
