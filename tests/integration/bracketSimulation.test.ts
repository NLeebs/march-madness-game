import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/bracket/simulation/route";
import { buildTournamentState, buildPicksState } from "@/tests/factories";

const mockPersistTournament = vi.fn();

vi.mock("@/application/useCases/PersistTournament", () => ({
  persistTournament: (...args: unknown[]) => mockPersistTournament(...args),
}));

vi.mock("@/utils/api/allowedOrigins", () => ({
  getAllowedOrigins: () => ["http://localhost:3000"],
}));

function buildValidBody(overrides: Record<string, unknown> = {}) {
  const tournamentState = buildTournamentState({
    yearId: "year-uuid-123",
    tournamentScoringRulesId: "scoring-uuid-456",
    playerScore: 200,
  });

  return {
    tournamentState: {
      ...tournamentState,
      tournamentSeeds: { east: [], west: [], south: [], midwest: [] },
    },
    picksState: buildPicksState(),
    anonUserId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    ...overrides,
  };
}

function createRequest(
  body: unknown,
  options: {
    method?: string;
    contentType?: string;
    origin?: string;
  } = {}
): NextRequest {
  const { method = "POST", contentType = "application/json", origin = "http://localhost:3000" } =
    options;

  const headers: Record<string, string> = {};
  if (contentType) headers["content-type"] = contentType;
  if (origin) headers["origin"] = origin;

  return new NextRequest("http://localhost:3000/api/bracket/simulation", {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("POST /api/bracket/simulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    mockPersistTournament.mockResolvedValue({
      bracketId: "new-bracket-uuid",
      success: true,
    });
  });

  describe("successful requests", () => {
    it("should return 201 with bracketId on success", async () => {
      const response = await POST(createRequest(buildValidBody()));

      expect(response.status).toBe(201);
      const json = await parseResponse(response);
      expect(json).toEqual({
        bracketId: "new-bracket-uuid",
        success: true,
      });
    });

    it("should call persistTournament with the request body", async () => {
      const body = buildValidBody({ userId: null, anonUserId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" });
      await POST(createRequest(body));

      expect(mockPersistTournament).toHaveBeenCalledTimes(1);
      expect(mockPersistTournament).toHaveBeenCalledWith(
        expect.objectContaining({
          anonUserId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          tournamentState: expect.objectContaining({
            yearId: "year-uuid-123",
            playerScore: 200,
          }),
        })
      );
    });

    it("should accept a request with a userId", async () => {
      const body = buildValidBody({
        userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        anonUserId: null,
      });
      const response = await POST(createRequest(body));

      expect(response.status).toBe(201);
    });
  });

  describe("request body validation", () => {
    it("should return 400 when yearId is missing", async () => {
      const body = buildValidBody();
      (body.tournamentState as Record<string, unknown>).yearId = "";

      const response = await POST(createRequest(body));

      expect(response.status).toBe(400);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
    });

    it("should return 400 when tournamentScoringRulesId is missing", async () => {
      const body = buildValidBody();
      (body.tournamentState as Record<string, unknown>).tournamentScoringRulesId = "";

      const response = await POST(createRequest(body));

      expect(response.status).toBe(400);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
    });

    it("should return 400 when playerScore is not a number", async () => {
      const body = buildValidBody();
      (body.tournamentState as Record<string, unknown>).playerScore = "not-a-number";

      const response = await POST(createRequest(body));

      expect(response.status).toBe(400);
    });

    it("should return 400 when tournamentState is missing entirely", async () => {
      const body = buildValidBody();
      delete (body as Record<string, unknown>).tournamentState;

      const response = await POST(createRequest(body));

      expect(response.status).toBe(400);
    });

    it("should return 400 when picksState is missing entirely", async () => {
      const body = buildValidBody();
      delete (body as Record<string, unknown>).picksState;

      const response = await POST(createRequest(body));

      expect(response.status).toBe(400);
    });

    it("should return 400 when userId is not a valid uuid", async () => {
      const body = buildValidBody({ userId: "not-a-uuid" });

      const response = await POST(createRequest(body));

      expect(response.status).toBe(400);
    });

    it("should return 400 when anonUserId is not a valid uuid", async () => {
      const body = buildValidBody({ anonUserId: "not-a-uuid" });

      const response = await POST(createRequest(body));

      expect(response.status).toBe(400);
    });
  });

  describe("security middleware", () => {
    it("should return 400 when content-type is not application/json", async () => {
      const request = createRequest(buildValidBody(), {
        contentType: "text/plain",
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("Content-Type");
    });

    it("should return 400 when content-type header is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/bracket/simulation",
        {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
          body: JSON.stringify(buildValidBody()),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("Content-Type");
    });
  });

  describe("use case error handling", () => {
    it("should return 500 when persistTournament throws a generic error", async () => {
      mockPersistTournament.mockRejectedValue(
        new Error("Database connection failed")
      );

      const response = await POST(createRequest(buildValidBody()));

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Database connection failed");
    });

    it("should return error response with correct structure", async () => {
      mockPersistTournament.mockRejectedValue(
        new Error("Something went wrong")
      );

      const response = await POST(createRequest(buildValidBody()));

      const json = await parseResponse(response);
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            statusCode: expect.any(Number),
            timestamp: expect.any(String),
            path: "/api/bracket/simulation",
          }),
        })
      );
    });

    it("should not call persistTournament when validation fails", async () => {
      const body = buildValidBody();
      delete (body as Record<string, unknown>).tournamentState;

      await POST(createRequest(body));

      expect(mockPersistTournament).not.toHaveBeenCalled();
    });
  });
});
