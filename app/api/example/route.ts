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
} from "@/utils/errorHandling";

// Example validation schema
const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  age: z.number().min(18, "Must be at least 18 years old").optional(),
});

// Example middleware combination
const requestMiddleware = combineMiddleware(
  validateMethod(["POST"]),
  validateContentType(["application/json"]),
  rateLimit(10, 60000) // 10 requests per minute
);

// Handles POST requests to /api/example
export const POST = apiHandler(async (req: NextRequest) => {
  // Apply middleware
  await requestMiddleware(req);

  // Validate request body
  const validatedData = await validateRequest(CreateUserSchema)(req);

  // Simulate some processing
  const user = {
    id: Math.random().toString(36).substr(2, 9),
    ...validatedData,
    createdAt: new Date().toISOString(),
  };

  return createSuccessResponse(user, "User created successfully");
}, "/api/example");

// Handles GET requests to /api/example
export const GET = apiHandler(async (req: NextRequest) => {
  // Example of throwing different types of errors
  const { searchParams } = new URL(req.url);
  const errorType = searchParams.get("error");

  switch (errorType) {
    case "validation":
      throw new Error("This is a validation error");
    case "notfound":
      throw new Error("Resource not found");
    case "server":
      throw new Error("Internal server error");
    default:
      return createSuccessResponse(
        { message: "Example API endpoint working correctly" },
        "Success"
      );
  }
}, "/api/example");
