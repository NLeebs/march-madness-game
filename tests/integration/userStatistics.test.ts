import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/user-statistics/[userId]/[yearId]/route";
import { buildUserTotalStats } from "@/tests/factories";
import { ForbiddenError, UnauthorizedError } from "@/utils/errorHandling";

const mockGetUserTotalStatsByYearId = vi.fn();
const mockAuthorizeUserAccess = vi.fn();

vi.mock("@/application/useCases", () => ({
  getUserTotalStatsByYearId: (...args: unknown[]) =>
    mockGetUserTotalStatsByYearId(...args),
}));

vi.mock("@/utils/api/authorizeUserAccess", () => ({
  authorizeUserAccess: (...args: unknown[]) => mockAuthorizeUserAccess(...args),
}));

function createRequest(userId: string, yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/user-statistics/${userId}/${yearId}`,
    { method: "GET" }
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/user-statistics/[userId]/[yearId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeUserAccess.mockResolvedValue(undefined);
  });

  describe("successful requests", () => {
    it("should return 200 with user total stats for a valid userId and yearId", async () => {
      const mockStats = buildUserTotalStats();
      mockGetUserTotalStatsByYearId.mockResolvedValue(mockStats);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockStats);
    });

    it("should pass both userId and yearId params to the use case", async () => {
      mockGetUserTotalStatsByYearId.mockResolvedValue(buildUserTotalStats());

      await GET(createRequest("specific-user", "specific-year"), {
        params: { userId: "specific-user", yearId: "specific-year" },
      });

      expect(mockGetUserTotalStatsByYearId).toHaveBeenCalledWith(
        "specific-user",
        "specific-year"
      );
      expect(mockGetUserTotalStatsByYearId).toHaveBeenCalledTimes(1);
    });

    it("should return all scoring fields in the response", async () => {
      const stats = buildUserTotalStats({
        high_score: 150,
        low_score: 30,
        average_score: 95.0,
        high_score_rank: 1,
      });
      mockGetUserTotalStatsByYearId.mockResolvedValue(stats);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      const json = await parseResponse(response);
      expect(json.high_score).toBe(150);
      expect(json.low_score).toBe(30);
      expect(json.average_score).toBe(95.0);
      expect(json.high_score_rank).toBe(1);
    });

    it("should return round-level accuracy fields in the response", async () => {
      const stats = buildUserTotalStats({
        round_one_correct_percentage: 75.0,
        sweet_sixteen_correct_percentage: 50.0,
        champion_correct_percentage: 10.0,
      });
      mockGetUserTotalStatsByYearId.mockResolvedValue(stats);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      const json = await parseResponse(response);
      expect(json.round_one_correct_percentage).toBe(75.0);
      expect(json.sweet_sixteen_correct_percentage).toBe(50.0);
      expect(json.champion_correct_percentage).toBe(10.0);
    });

    it("should return bracket total fields in the response", async () => {
      const stats = buildUserTotalStats({
        total_brackets: 25,
        total_picks: 1575,
        total_correct_picks: 900,
      });
      mockGetUserTotalStatsByYearId.mockResolvedValue(stats);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      const json = await parseResponse(response);
      expect(json.total_brackets).toBe(25);
      expect(json.total_picks).toBe(1575);
      expect(json.total_correct_picks).toBe(900);
    });
  });

  describe("error handling", () => {
    it("should return 401 when the user is unauthenticated", async () => {
      mockAuthorizeUserAccess.mockRejectedValue(
        new UnauthorizedError("Authentication required to access user data"),
      );

      const response = await GET(createRequest("user-uuid-123", "year-uuid-1"), {
        params: { userId: "user-uuid-123", yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(401);
      const json = await parseResponse(response);
      expect(json.error.message).toBe(
        "Authentication required to access user data",
      );
      expect(mockGetUserTotalStatsByYearId).not.toHaveBeenCalled();
    });

    it("should return 403 for cross-user statistics access", async () => {
      mockAuthorizeUserAccess.mockRejectedValue(
        new ForbiddenError("You are not allowed to access another user's data"),
      );

      const response = await GET(
        createRequest("target-user-uuid", "year-uuid-1"),
        { params: { userId: "target-user-uuid", yearId: "year-uuid-1" } }
      );

      expect(response.status).toBe(403);
      const json = await parseResponse(response);
      expect(json.error.message).toBe(
        "You are not allowed to access another user's data",
      );
      expect(mockGetUserTotalStatsByYearId).not.toHaveBeenCalled();
    });

    it("should return 500 when the use case throws a generic error", async () => {
      mockGetUserTotalStatsByYearId.mockRejectedValue(
        new Error("Failed to fetch user total stats: connection refused")
      );

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch user total stats: connection refused"
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetUserTotalStatsByYearId.mockRejectedValue(
        new Error("Something broke")
      );

      const response = await GET(
        createRequest("test-user-id", "test-year-id"),
        { params: { userId: "test-user-id", yearId: "test-year-id" } }
      );

      const json = await parseResponse(response);
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            statusCode: expect.any(Number),
            timestamp: expect.any(String),
            path: "/api/user-statistics/test-user-id/test-year-id",
          }),
        })
      );
    });

    it("should return 500 when user total stats are not found", async () => {
      mockGetUserTotalStatsByYearId.mockRejectedValue(
        new Error(
          "No user total stats found for user_id: user-uuid-123 and year_id: year-uuid-1"
        )
      );

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("No user total stats found");
    });

    it("should return 500 when a database error occurs", async () => {
      mockGetUserTotalStatsByYearId.mockRejectedValue(
        new Error("Failed to fetch user total stats: PGRST116")
      );

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("Failed to fetch user total stats");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetUserTotalStatsByYearId.mockResolvedValue(buildUserTotalStats());

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });
  });
});
