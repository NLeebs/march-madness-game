import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/bracket/simulation/route";
import { ValidationError } from "@/utils/errorHandling";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import { buildLeague, chalkPicks } from "@/tests/factories";

const mockPlayTournament = vi.fn();
const mockGetSessionUserId = vi.fn();

vi.mock("@/application/useCases", () => ({
  playTournament: (...args: unknown[]) => mockPlayTournament(...args),
}));

vi.mock("@/utils/api/getSessionUserId", () => ({
  getSessionUserId: () => mockGetSessionUserId(),
}));

vi.mock("@/utils/api/allowedOrigins", () => ({
  getAllowedOrigins: () => ["http://localhost:3000"],
}));

const FIELD_TOKEN = "signed.field-token";
const ANON_ID = "223e4567-e89b-42d3-a456-426614174001";
const SESSION_ID = "323e4567-e89b-42d3-a456-426614174002";

const league = buildLeague();
const teamNames = Object.values(league.teamStats).flatMap((conf) =>
  Object.keys(conf)
);

function buildValidBody(overrides: Record<string, unknown> = {}) {
  const field = {
    tournamentTeams: teamNames.slice(0, 60),
    playinTeams: {
      elevenSeeds: teamNames.slice(60, 64),
      sixteenSeeds: teamNames.slice(64, 68),
    },
  };
  const roundOne = buildRoundOneMatchups(
    seedTournament(field.tournamentTeams),
    field.playinTeams
  );
  return {
    fieldToken: FIELD_TOKEN,
    picks: chalkPicks(roundOne),
    anonUserId: ANON_ID,
    ...overrides,
  };
}

function createRequest(
  body: unknown,
  options: {
    method?: string;
    contentType?: string;
    origin?: string;
    ip?: string;
  } = {}
): NextRequest {
  const {
    method = "POST",
    contentType = "application/json",
    origin = "http://localhost:3000",
    ip,
  } = options;

  const headers: Record<string, string> = {};
  if (contentType) headers["content-type"] = contentType;
  if (origin) headers["origin"] = origin;
  if (ip) headers["x-forwarded-for"] = ip;

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
    mockGetSessionUserId.mockResolvedValue(null);
    mockPlayTournament.mockResolvedValue({
      bracketId: "new-bracket-uuid",
      playerScore: 10,
    });
  });

  it("returns 201 with the use case result", async () => {
    const response = await POST(createRequest(buildValidBody()));

    expect(response.status).toBe(201);
    expect(await parseResponse(response)).toEqual({
      bracketId: "new-bracket-uuid",
      playerScore: 10,
    });
  });

  it("passes fieldToken to the use case", async () => {
    const body = buildValidBody({ fieldToken: "another.token" });

    await POST(createRequest(body));

    expect(mockPlayTournament).toHaveBeenCalledWith(
      expect.objectContaining({ fieldToken: "another.token" })
    );
  });

  it("session user wins: userId from session, anonUserId null even if sent", async () => {
    mockGetSessionUserId.mockResolvedValue(SESSION_ID);
    const body = buildValidBody();

    await POST(createRequest(body));

    expect(mockPlayTournament).toHaveBeenCalledTimes(1);
    expect(mockPlayTournament).toHaveBeenCalledWith({
      fieldToken: FIELD_TOKEN,
      picks: body.picks,
      userId: SESSION_ID,
      anonUserId: null,
    });
  });

  it("no session: anonUserId comes from the body", async () => {
    await POST(createRequest(buildValidBody()));

    expect(mockPlayTournament).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, anonUserId: ANON_ID })
    );
  });

  it("no session and no anonUserId: passes nulls to the use case", async () => {
    await POST(createRequest(buildValidBody({ anonUserId: undefined })));

    expect(mockPlayTournament).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, anonUserId: null })
    );
  });

  it("allows 60 requests a minute from one IP, so players on a shared network don't crash each other's games", async () => {
    const body = buildValidBody();
    const ip = "203.0.113.60";
    for (let i = 0; i < 60; i++) {
      const response = await POST(createRequest(body, { ip }));
      expect(response.status).toBe(201);
    }

    const response = await POST(createRequest(body, { ip }));

    expect(response.status).toBe(400);
    expect((await parseResponse(response)).error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  describe("request body validation", () => {
    it("returns 400 when the body has userId", async () => {
      const response = await POST(
        createRequest(buildValidBody({ userId: SESSION_ID }))
      );

      expect(response.status).toBe(400);
      expect((await parseResponse(response)).success).toBe(false);
      expect(mockPlayTournament).not.toHaveBeenCalled();
    });

    it("returns 400 when the body has playerScore", async () => {
      const response = await POST(
        createRequest(buildValidBody({ playerScore: 100 }))
      );

      expect(response.status).toBe(400);
      expect(mockPlayTournament).not.toHaveBeenCalled();
    });

    it("returns 400 for malformed picks", async () => {
      const response = await POST(
        createRequest(buildValidBody({ picks: { roundTwoPicks: {} } }))
      );

      expect(response.status).toBe(400);
      expect(mockPlayTournament).not.toHaveBeenCalled();
    });

    it("returns 400 when the body has yearId or field", async () => {
      for (const extra of [{ yearId: "x" }, { field: {} }]) {
        const response = await POST(createRequest(buildValidBody(extra)));
        expect(response.status).toBe(400);
      }
      expect(mockPlayTournament).not.toHaveBeenCalled();
    });

    it("returns 400 when fieldToken is missing", async () => {
      const response = await POST(
        createRequest(buildValidBody({ fieldToken: undefined }))
      );

      expect(response.status).toBe(400);
      expect(mockPlayTournament).not.toHaveBeenCalled();
    });

    it("returns 400 when anonUserId is not a uuid", async () => {
      const response = await POST(
        createRequest(buildValidBody({ anonUserId: "not-a-uuid" }))
      );

      expect(response.status).toBe(400);
    });
  });

  describe("security middleware", () => {
    it("returns 400 when content-type is not application/json", async () => {
      const response = await POST(
        createRequest(buildValidBody(), { contentType: "text/plain" })
      );

      expect(response.status).toBe(400);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("Content-Type");
    });

    it("returns 400 when content-type header is missing", async () => {
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
      expect((await parseResponse(response)).error.message).toContain(
        "Content-Type"
      );
    });
  });

  describe("use case error handling", () => {
    it("returns 400 when the use case throws ValidationError", async () => {
      mockPlayTournament.mockRejectedValue(
        new ValidationError("Picks are inconsistent")
      );

      const response = await POST(createRequest(buildValidBody()));

      expect(response.status).toBe(400);
      expect((await parseResponse(response)).error.message).toBe(
        "Picks are inconsistent"
      );
    });

    it("returns the 500 error shape on a generic error", async () => {
      mockPlayTournament.mockRejectedValue(
        new Error("Database connection failed")
      );

      const response = await POST(createRequest(buildValidBody()));

      expect(response.status).toBe(500);
      expect(await parseResponse(response)).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: "Database connection failed",
            statusCode: 500,
            timestamp: expect.any(String),
            path: "/api/bracket/simulation",
          }),
        })
      );
    });
  });
});
