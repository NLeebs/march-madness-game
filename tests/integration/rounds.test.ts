import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/rounds/route";
import { buildRound } from "@/tests/factories";

const mockGetRounds = vi.fn();

vi.mock("@/application/useCases/GetRounds", () => ({
  getRounds: (...args: unknown[]) => mockGetRounds(...args),
}));

function createRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/rounds", {
    method: "GET",
  });
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/rounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with a list of rounds", async () => {
      const mockRounds = [
        buildRound({ round_name: "First Round" }),
        buildRound({
          id: "22222222-2222-2222-2222-222222222222",
          round_name: "Second Round",
        }),
      ];
      mockGetRounds.mockResolvedValue(mockRounds);

      const response = await GET(createRequest());

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockRounds);
    });

    it("should return 200 with an empty array when no rounds exist", async () => {
      mockGetRounds.mockResolvedValue([]);

      const response = await GET(createRequest());

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual([]);
    });

    it("should call getRounds use case once", async () => {
      mockGetRounds.mockResolvedValue([]);

      await GET(createRequest());

      expect(mockGetRounds).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should return 500 when the use case throws a generic error", async () => {
      mockGetRounds.mockRejectedValue(
        new Error("Failed to fetch rounds: connection refused"),
      );

      const response = await GET(createRequest());

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Failed to fetch rounds: connection refused");
    });

    it("should return error response with correct structure and path", async () => {
      mockGetRounds.mockRejectedValue(new Error("Something broke"));

      const response = await GET(createRequest());

      const json = await parseResponse(response);
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            statusCode: expect.any(Number),
            timestamp: expect.any(String),
            path: "/api/rounds",
          }),
        }),
      );
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetRounds.mockResolvedValue([]);

      const response = await GET(createRequest());

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });
});
