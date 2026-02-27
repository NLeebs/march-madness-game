import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/tournament-scoring-rules/[yearId]/route";

const mockGetScoringRuleIdByYearId = vi.fn();

vi.mock("@/application/useCases", () => ({
  getScoringRuleIdByYearId: (...args: unknown[]) =>
    mockGetScoringRuleIdByYearId(...args),
}));

function createRequest(yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/tournament-scoring-rules/${yearId}`,
    { method: "GET" }
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/tournament-scoring-rules/[yearId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with the scoring rule id and message", async () => {
      mockGetScoringRuleIdByYearId.mockResolvedValue("scoring-rule-uuid-123");

      const response = await GET(createRequest("year-uuid"), {
        params: { yearId: "year-uuid" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual({
        tournamentScoringRuleId: "scoring-rule-uuid-123",
        message: "Tournament scoring rules ID received",
      });
    });

    it("should pass the yearId param to the use case", async () => {
      mockGetScoringRuleIdByYearId.mockResolvedValue("rule-id");

      await GET(createRequest("specific-year-uuid"), {
        params: { yearId: "specific-year-uuid" },
      });

      expect(mockGetScoringRuleIdByYearId).toHaveBeenCalledWith(
        "specific-year-uuid"
      );
      expect(mockGetScoringRuleIdByYearId).toHaveBeenCalledTimes(1);
    });

    it("should return the scoring rule id in the response body", async () => {
      const expectedId = "unique-rule-id-456";
      mockGetScoringRuleIdByYearId.mockResolvedValue(expectedId);

      const response = await GET(createRequest("year-uuid"), {
        params: { yearId: "year-uuid" },
      });

      const json = await parseResponse(response);
      expect(json.tournamentScoringRuleId).toBe(expectedId);
    });
  });

  describe("error handling", () => {
    it("should return 500 when the use case throws a generic error", async () => {
      mockGetScoringRuleIdByYearId.mockRejectedValue(
        new Error("Database connection failed")
      );

      const response = await GET(createRequest("year-uuid"), {
        params: { yearId: "year-uuid" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Database connection failed");
    });

    it("should return error response with correct structure and path", async () => {
      mockGetScoringRuleIdByYearId.mockRejectedValue(
        new Error("Something broke")
      );

      const response = await GET(createRequest("test-year-id"), {
        params: { yearId: "test-year-id" },
      });

      const json = await parseResponse(response);
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            statusCode: expect.any(Number),
            timestamp: expect.any(String),
            path: "/api/tournament_scoring_rules/test-year-id",
          }),
        })
      );
    });

    it("should return 500 when scoring rules are not found", async () => {
      mockGetScoringRuleIdByYearId.mockRejectedValue(
        new Error(
          "No bracket scoring rules found for year_id: nonexistent-uuid"
        )
      );

      const response = await GET(createRequest("nonexistent-uuid"), {
        params: { yearId: "nonexistent-uuid" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain(
        "No bracket scoring rules found"
      );
    });

    it("should return 500 when the repository connection fails", async () => {
      mockGetScoringRuleIdByYearId.mockRejectedValue(
        new Error("Failed to fetch bracket scoring rules: connection refused")
      );

      const response = await GET(createRequest("year-uuid"), {
        params: { yearId: "year-uuid" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain(
        "Failed to fetch bracket scoring rules"
      );
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetScoringRuleIdByYearId.mockResolvedValue("rule-id");

      const response = await GET(createRequest("year-uuid"), {
        params: { yearId: "year-uuid" },
      });

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });
  });
});
