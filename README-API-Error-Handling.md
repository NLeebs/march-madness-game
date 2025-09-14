# API Error Handling Guide

This guide explains how to use the global error handling middleware system for Next.js API routes.

## Overview

The error handling system provides:

- **Global error catching** for all API routes
- **Custom error classes** for different error types
- **Consistent error responses** across all endpoints
- **Middleware utilities** for common validations
- **Type-safe error handling** with TypeScript

## Quick Start

### 1. Basic API Route with Error Handling

```typescript
import { apiHandler, createSuccessResponse } from "@/utils/errorHandling";

export const GET = apiHandler(async () => {
  return createSuccessResponse({ message: "Hello World" }, "Success message");
}, "/api/your-endpoint");
```

### 2. Using Custom Error Classes

```typescript
import {
  apiHandler,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from "@/utils/errorHandling";

export const POST = apiHandler(async (req: Request) => {
  const body = await req.json();

  if (!body.email) {
    throw new ValidationError("Email is required");
  }

  if (body.email === "admin@example.com") {
    throw new UnauthorizedError("Access denied");
  }

  // Your logic here...
}, "/api/your-endpoint");
```

## Error Classes

### AppError (Base Class)

```typescript
new AppError(message, statusCode, isOperational, code);
```

### Predefined Error Classes

- `ValidationError` (400) - Input validation errors
- `UnauthorizedError` (401) - Authentication required
- `ForbiddenError` (403) - Access denied
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflict
- `InternalServerError` (500) - Server errors

## Middleware Utilities

### Request Validation with Zod

```typescript
import { z } from "zod";
import { validateRequest } from "@/utils/errorHandling";

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const data = await validateRequest(UserSchema)(req);
  // data is now type-safe and validated
}, "/api/users");
```

### Method Validation

```typescript
import { validateMethod } from "@/utils/errorHandling";

export const POST = apiHandler(async (req: NextRequest) => {
  validateMethod(["POST"])(req);
  // Only POST requests allowed
}, "/api/users");
```

### Content-Type Validation

```typescript
import { validateContentType } from "@/utils/errorHandling";

export const POST = apiHandler(async (req: NextRequest) => {
  validateContentType(["application/json"])(req);
  // Only JSON content allowed
}, "/api/users");
```

### Rate Limiting

```typescript
import { rateLimit } from "@/utils/errorHandling";

export const POST = apiHandler(async (req: NextRequest) => {
  rateLimit(10, 60000)(req); // 10 requests per minute
  // Your logic here
}, "/api/users");
```

### Combining Middleware

```typescript
import { combineMiddleware } from "@/utils/errorHandling";

const middleware = combineMiddleware(
  validateMethod(["POST"]),
  validateContentType(["application/json"]),
  rateLimit(10, 60000)
);

export const POST = apiHandler(async (req: NextRequest) => {
  await middleware(req);
  // All middleware applied
}, "/api/users");
```

## Error Response Format

All errors return a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/endpoint",
    "details": {} // Optional additional details
  }
}
```

## Success Response Format

```json
{
  "success": true,
  "data": {},
  "message": "Optional success message"
}
```

## Best Practices

1. **Always use `apiHandler`** to wrap your route handlers
2. **Use specific error classes** instead of generic Error
3. **Validate input** using Zod schemas
4. **Apply middleware** for common validations
5. **Include meaningful error messages** for debugging
6. **Use appropriate HTTP status codes**

## Example: Complete API Route

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiHandler,
  createSuccessResponse,
  validateRequest,
  validateMethod,
  validateContentType,
  rateLimit,
  combineMiddleware,
  ValidationError,
  NotFoundError,
} from "@/utils/errorHandling";

const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  age: z.number().min(18, "Must be at least 18").optional(),
});

const middleware = combineMiddleware(
  validateMethod(["POST"]),
  validateContentType(["application/json"]),
  rateLimit(5, 60000) // 5 requests per minute
);

export const POST = apiHandler(async (req: NextRequest) => {
  // Apply middleware
  await middleware(req);

  // Validate request body
  const data = await validateRequest(CreateUserSchema)(req);

  // Business logic
  if (data.email === "admin@example.com") {
    throw new ValidationError("Admin email not allowed");
  }

  // Simulate user creation
  const user = {
    id: Math.random().toString(36).substr(2, 9),
    ...data,
    createdAt: new Date().toISOString(),
  };

  return createSuccessResponse(user, "User created successfully");
}, "/api/users");
```

## Testing Error Handling

You can test different error scenarios:

```bash
# Test validation error
curl -X POST http://localhost:3000/api/example \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'

# Test rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/example \
    -H "Content-Type: application/json" \
    -d '{"name": "test", "email": "test@example.com"}'
done
```

This system provides comprehensive error handling for your Next.js API routes while maintaining clean, type-safe code.
