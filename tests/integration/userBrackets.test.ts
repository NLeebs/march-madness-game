import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/brackets/[userId]/[yearId]/route";
import { buildBracket } from "@/tests/factories";

const mockGetUserBracketsByYearId = vi.fn();

vi.mock("@/application/useCases/GetUserBracketsByYearId", () => ({
  getUserBracketsByYearId: (...args: unknown[]) =>
    mockGetUserBracketsByYearId(...args),
}));

function createRequest(userId: string, yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/brackets/${userId}/${yearId}`,
    { method: "GET" }
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/brackets/[userId]/[yearId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with brackets for a valid userId and yearId", async () => {
      const mockBrackets = [buildBracket(), buildBracket({ score: 85 })];
      mockGetUserBracketsByYearId.mockResolvedValue(mockBrackets);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockBrackets);
    });

    it("should pass both userId and yearId params to the use case", async () => {
      mockGetUserBracketsByYearId.mockResolvedValue([]);

      await GET(createRequest("specific-user", "specific-year"), {
        params: { userId: "specific-user", yearId: "specific-year" },
      });

      expect(mockGetUserBracketsByYearId).toHaveBeenCalledWith(
        "specific-user",
        "specific-year"
      );
      expect(mockGetUserBracketsByYearId).toHaveBeenCalledTimes(1);
    });

    it("should return 200 with an empty array when no brackets exist", async () => {
      mockGetUserBracketsByYearId.mockResolvedValue([]);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual([]);
    });

    it("should return all bracket fields in the response", async () => {
      const bracket = buildBracket({
        id: "bracket-abc",
        score: 100,
        created_at: "2025-03-21T14:00:00Z",
      });
      mockGetUserBracketsByYearId.mockResolvedValue([bracket]);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      const json = await parseResponse(response);
      expect(json).toHaveLength(1);
      expect(json[0].id).toBe("bracket-abc");
      expect(json[0].score).toBe(100);
      expect(json[0].created_at).toBe("2025-03-21T14:00:00Z");
    });

    it("should return multiple brackets for the same user and year", async () => {
      const brackets = [
        buildBracket({ id: "bracket-1", score: 42 }),
        buildBracket({ id: "bracket-2", score: 67 }),
        buildBracket({ id: "bracket-3", score: 91 }),
      ];
      mockGetUserBracketsByYearId.mockResolvedValue(brackets);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      const json = await parseResponse(response);
      expect(json).toHaveLength(3);
      expect(json.map((b: { score: number }) => b.score)).toEqual([42, 67, 91]);
    });
  });

  describe("error handling", () => {
    it("should return 500 when the use case throws a generic error", async () => {
      mockGetUserBracketsByYearId.mockRejectedValue(
        new Error("Failed to fetch brackets: connection refused")
      );

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch brackets: connection refused"
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetUserBracketsByYearId.mockRejectedValue(
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
            path: "/api/brackets/test-user-id/test-year-id",
          }),
        })
      );
    });

    it("should return 500 when a database error occurs", async () => {
      mockGetUserBracketsByYearId.mockRejectedValue(
        new Error("Failed to fetch brackets: PGRST116")
      );

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } }
      );

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("Failed to fetch brackets");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetUserBracketsByYearId.mockResolvedValue([buildBracket()]);

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
