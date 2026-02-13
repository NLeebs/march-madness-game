import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/years/route";
import { buildYear } from "@/tests/factories";

const mockGetYears = vi.fn();

vi.mock("@/application/useCases/GetYears", () => ({
  getYears: (...args: unknown[]) => mockGetYears(...args),
}));

function createRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/years", {
    method: "GET",
  });
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/years", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with a list of years", async () => {
      const mockYears = [
        buildYear({ id: "id-1", year: 2024 }),
        buildYear({ id: "id-2", year: 2025 }),
      ];
      mockGetYears.mockResolvedValue(mockYears);

      const response = await GET(createRequest());

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockYears);
    });

    it("should return 200 with an empty array when no years exist", async () => {
      mockGetYears.mockResolvedValue([]);

      const response = await GET(createRequest());

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual([]);
    });

    it("should call getYears use case once", async () => {
      mockGetYears.mockResolvedValue([]);

      await GET(createRequest());

      expect(mockGetYears).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should return 500 when the use case throws a generic error", async () => {
      mockGetYears.mockRejectedValue(
        new Error("Failed to fetch years: connection refused")
      );

      const response = await GET(createRequest());

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch years: connection refused"
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetYears.mockRejectedValue(new Error("Something broke"));

      const response = await GET(createRequest());

      const json = await parseResponse(response);
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            statusCode: expect.any(Number),
            timestamp: expect.any(String),
            path: "/api/years",
          }),
        })
      );
    });

    it("should return 500 when Firebase team stats years fetch fails", async () => {
      mockGetYears.mockRejectedValue(
        new Error("Error fetching team statistics years from Firebase")
      );

      const response = await GET(createRequest());

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain(
        "Error fetching team statistics years from Firebase"
      );
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetYears.mockResolvedValue([]);

      const response = await GET(createRequest());

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });
  });
});
