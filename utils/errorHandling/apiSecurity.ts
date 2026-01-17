import { NextRequest } from "next/server";
import { ValidationError } from "./AppError";

export function validateOrigin(
  allowedOrigins: string[],
  allowLocalhost: boolean = true
) {
  return (req: NextRequest) => {
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");

    if (allowLocalhost && process.env.NODE_ENV === "development") {
      if (origin?.includes("localhost") || origin?.includes("127.0.0.1")) {
        return;
      }
      if (referer?.includes("localhost") || referer?.includes("127.0.0.1")) {
        return;
      }
    }

    if (origin) {
      const isAllowed = allowedOrigins.some((allowed) => {
        return origin === allowed || origin.startsWith(allowed);
      });
      if (isAllowed) {
        return;
      }
    }

    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const isAllowed = allowedOrigins.some((allowed) => {
          const allowedUrl = new URL(allowed);
          return (
            refererUrl.origin === allowedUrl.origin ||
            refererUrl.hostname === allowedUrl.hostname
          );
        });
        if (isAllowed) {
          return;
        }
      } catch {}
    }

    throw new ValidationError("Request origin not allowed", "INVALID_ORIGIN");
  };
}

export function validateApiKey(
  apiKey: string,
  headerName: string = "x-api-key"
) {
  return (req: NextRequest) => {
    const providedKey = req.headers.get(headerName);

    if (!providedKey || providedKey !== apiKey) {
      throw new ValidationError(
        "Invalid or missing API key",
        "INVALID_API_KEY"
      );
    }
  };
}

export function validateCsrfToken(
  getToken: (req: NextRequest) => Promise<string | null> | string | null
) {
  return async (req: NextRequest) => {
    const providedToken = req.headers.get("x-csrf-token");
    const expectedToken = await getToken(req);

    if (!expectedToken) {
      throw new ValidationError(
        "CSRF token not found in session",
        "MISSING_CSRF_TOKEN"
      );
    }

    if (!providedToken || providedToken !== expectedToken) {
      throw new ValidationError("Invalid CSRF token", "INVALID_CSRF_TOKEN");
    }
  };
}

export function validateUserAgent(
  requiredPattern?: string,
  blockedPatterns: string[] = ["curl", "wget", "python-requests", "postman"]
) {
  return (req: NextRequest) => {
    const userAgent = req.headers.get("user-agent")?.toLowerCase() || "";

    for (const pattern of blockedPatterns) {
      if (userAgent.includes(pattern.toLowerCase())) {
        throw new ValidationError(
          "Request blocked: invalid user agent",
          "BLOCKED_USER_AGENT"
        );
      }
    }

    if (requiredPattern && !userAgent.includes(requiredPattern.toLowerCase())) {
      throw new ValidationError(
        "Request blocked: invalid user agent",
        "INVALID_USER_AGENT"
      );
    }
  };
}

export function createSecurityMiddleware(options: {
  allowedOrigins?: string[];
  allowLocalhost?: boolean;
  apiKey?: string;
  apiKeyHeader?: string;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  validateUserAgent?: boolean;
}) {
  const middlewares: Array<(req: NextRequest) => any> = [];

  if (options.allowedOrigins && options.allowedOrigins.length > 0) {
    middlewares.push(
      validateOrigin(options.allowedOrigins, options.allowLocalhost ?? true)
    );
  }

  if (options.apiKey) {
    middlewares.push(validateApiKey(options.apiKey, options.apiKeyHeader));
  }

  if (options.validateUserAgent) {
    middlewares.push(validateUserAgent());
  }

  return middlewares;
}
