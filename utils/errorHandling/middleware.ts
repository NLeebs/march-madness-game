import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "./AppError";

/**
 * Request validation middleware
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  getData: (req: NextRequest) => any = (req) => req.json()
) {
  return async (req: NextRequest): Promise<T> => {
    try {
      const data = await getData(req);
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(
          "Request validation failed",
          "VALIDATION_ERROR"
        );
      }
      throw error;
    }
  };
}

/**
 * Method validation middleware
 */
export function validateMethod(allowedMethods: string[]) {
  return (req: NextRequest) => {
    if (!allowedMethods.includes(req.method)) {
      throw new ValidationError(
        `Method ${
          req.method
        } not allowed. Allowed methods: ${allowedMethods.join(", ")}`,
        "METHOD_NOT_ALLOWED"
      );
    }
  };
}

/**
 * Content-Type validation middleware
 */
export function validateContentType(expectedTypes: string[]) {
  return (req: NextRequest) => {
    const contentType = req.headers.get("content-type");

    if (!contentType) {
      throw new ValidationError(
        "Content-Type header is required",
        "MISSING_CONTENT_TYPE"
      );
    }

    const isValidType = expectedTypes.some((type) =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isValidType) {
      throw new ValidationError(
        `Invalid Content-Type. Expected: ${expectedTypes.join(
          " or "
        )}, got: ${contentType}`,
        "INVALID_CONTENT_TYPE"
      );
    }
  };
}

/**
 * Authentication middleware (placeholder - implement based on your auth system)
 */
export function requireAuth(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ValidationError(
      "Authorization header with Bearer token is required",
      "MISSING_AUTH_TOKEN"
    );
  }

  // Add your token validation logic here
  const token = authHeader.substring(7);

  if (!token) {
    throw new ValidationError(
      "Invalid or missing authentication token",
      "INVALID_AUTH_TOKEN"
    );
  }

  return token;
}

/**
 * Rate limiting middleware (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  return (req: NextRequest) => {
    const ip = req.ip || req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    rateLimitMap.forEach((value, key) => {
      if (value.resetTime < windowStart) {
        rateLimitMap.delete(key);
      }
    });

    const current = rateLimitMap.get(ip);

    if (!current) {
      rateLimitMap.set(ip, { count: 1, resetTime: now });
      return;
    }

    if (current.resetTime < windowStart) {
      rateLimitMap.set(ip, { count: 1, resetTime: now });
      return;
    }

    if (current.count >= maxRequests) {
      throw new ValidationError(
        "Too many requests, please try again later",
        "RATE_LIMIT_EXCEEDED"
      );
    }

    current.count++;
  };
}

/**
 * CORS middleware
 */
export function corsHeaders(origin?: string) {
  return (req: NextRequest) => {
    const response = NextResponse.next();

    // Set CORS headers
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    response.headers.set("Access-Control-Max-Age", "86400");

    return response;
  };
}

/**
 * Combine multiple middleware functions
 */
export function combineMiddleware(
  ...middlewares: Array<(req: NextRequest) => any>
) {
  return async (req: NextRequest) => {
    for (const middleware of middlewares) {
      await middleware(req);
    }
  };
}
