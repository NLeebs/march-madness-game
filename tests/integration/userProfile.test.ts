import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/profile/[userId]/route";
import { buildProfile } from "@/tests/factories";
import { ForbiddenError, UnauthorizedError } from "@/utils/errorHandling";

const mockGetUserProfile = vi.fn();
const mockAuthorizeUserAccess = vi.fn();

vi.mock("@/application/useCases/GetUserProfile", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

vi.mock("@/utils/api/authorizeUserAccess", () => ({
  authorizeUserAccess: (...args: unknown[]) => mockAuthorizeUserAccess(...args),
}));

function createRequest(userId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/profile/${userId}`,
    { method: "GET" }
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/profile/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeUserAccess.mockResolvedValue(undefined);
  });

  describe("successful requests", () => {
    it("should return 200 with the user profile", async () => {
      const mockProfile = buildProfile();
      mockGetUserProfile.mockResolvedValue(mockProfile);

      const response = await GET(createRequest("user-uuid-123"), {
        params: { userId: "user-uuid-123" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockProfile);
    });

    it("should pass the userId param to the use case", async () => {
      mockGetUserProfile.mockResolvedValue(buildProfile());

      await GET(createRequest("specific-user-uuid"), {
        params: { userId: "specific-user-uuid" },
      });

      expect(mockGetUserProfile).toHaveBeenCalledWith("specific-user-uuid");
      expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
    });

    it("should return all profile fields in the response", async () => {
      const profile = buildProfile({
        id: "abc-123",
        username: "madnessKing",
        favorite_team_id: "team-xyz",
        created_at: "2025-02-01T00:00:00Z",
        updated_at: "2025-03-15T12:00:00Z",
      });
      mockGetUserProfile.mockResolvedValue(profile);

      const response = await GET(createRequest("abc-123"), {
        params: { userId: "abc-123" },
      });

      const json = await parseResponse(response);
      expect(json.id).toBe("abc-123");
      expect(json.username).toBe("madnessKing");
      expect(json.favorite_team_id).toBe("team-xyz");
      expect(json.created_at).toBe("2025-02-01T00:00:00Z");
      expect(json.updated_at).toBe("2025-03-15T12:00:00Z");
    });

    it("should return a profile with null favorite_team_id", async () => {
      const profile = buildProfile({ favorite_team_id: null });
      mockGetUserProfile.mockResolvedValue(profile);

      const response = await GET(createRequest("user-uuid"), {
        params: { userId: "user-uuid" },
      });

      const json = await parseResponse(response);
      expect(json.favorite_team_id).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should return 401 when the user is unauthenticated", async () => {
      mockAuthorizeUserAccess.mockRejectedValue(
        new UnauthorizedError("Authentication required to access user data"),
      );

      const response = await GET(createRequest("user-uuid"), {
        params: { userId: "user-uuid" },
      });

      expect(response.status).toBe(401);
      const json = await parseResponse(response);
      expect(json.error.message).toBe(
        "Authentication required to access user data",
      );
      expect(mockGetUserProfile).not.toHaveBeenCalled();
    });

    it("should return 403 for cross-user profile access", async () => {
      mockAuthorizeUserAccess.mockRejectedValue(
        new ForbiddenError("You are not allowed to access another user's data"),
      );

      const response = await GET(createRequest("target-user-uuid"), {
        params: { userId: "target-user-uuid" },
      });

      expect(response.status).toBe(403);
      const json = await parseResponse(response);
      expect(json.error.message).toBe(
        "You are not allowed to access another user's data",
      );
      expect(mockGetUserProfile).not.toHaveBeenCalled();
    });

    it("should return 500 when the use case throws a generic error", async () => {
      mockGetUserProfile.mockRejectedValue(
        new Error("Failed to fetch user profile: connection refused")
      );

      const response = await GET(createRequest("user-uuid"), {
        params: { userId: "user-uuid" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch user profile: connection refused"
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetUserProfile.mockRejectedValue(new Error("Something broke"));

      const response = await GET(createRequest("test-user-id"), {
        params: { userId: "test-user-id" },
      });

      const json = await parseResponse(response);
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            statusCode: expect.any(Number),
            timestamp: expect.any(String),
            path: "/api/profile/test-user-id",
          }),
        })
      );
    });

    it("should return 500 when no profile is found", async () => {
      mockGetUserProfile.mockRejectedValue(
        new Error("No user profile found for id: nonexistent-uuid")
      );

      const response = await GET(createRequest("nonexistent-uuid"), {
        params: { userId: "nonexistent-uuid" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("No user profile found");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetUserProfile.mockResolvedValue(buildProfile());

      const response = await GET(createRequest("user-uuid"), {
        params: { userId: "user-uuid" },
      });

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });
  });
});
