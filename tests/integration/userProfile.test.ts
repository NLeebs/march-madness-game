import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/profile/[userId]/route";
import { buildProfile } from "@/tests/factories";

const mockGetUserProfile = vi.fn();

vi.mock("@/application/useCases/GetUserProfile", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
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
