import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playTournamentPost, type PlayTournamentRequest } from "@/src/utils/playTournamentPost";
import { AppError } from "@/utils/errorHandling";

// Only the error path reads the body, so a minimal request is enough.
const BODY = { fieldToken: "t" } as unknown as PlayTournamentRequest;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The JSON body handleApiError answers with. */
const apiErrorBody = (
  statusCode: number,
  message: string,
  code?: string,
  details?: { field: string; message: string; code: string }[]
) => ({
  success: false,
  error: {
    message,
    code,
    statusCode,
    timestamp: "2026-11-19T00:00:00.000Z",
    path: "/api/bracket/simulation",
    ...(details && { details }),
  },
});

const respond = (status: number, body: string) =>
  fetchMock.mockResolvedValue(
    new Response(body, { status, headers: { "Content-Type": "application/json" } })
  );

async function thrownBy(): Promise<AppError> {
  try {
    await playTournamentPost(BODY);
  } catch (e) {
    return e as AppError;
  }
  throw new Error("playTournamentPost did not throw");
}

describe("playTournamentPost errors", () => {
  it("carries the server's message, status and code", async () => {
    respond(400, JSON.stringify(apiErrorBody(400, "Inconsistent picks: roundTwoPicks.east[0] is Duke, not a team of that game")));

    const error = await thrownBy();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe(
      "Failed to play tournament (400): Inconsistent picks: roundTwoPicks.east[0] is Duke, not a team of that game"
    );
  });

  it("names the failing fields of a schema error", async () => {
    respond(
      400,
      JSON.stringify(
        apiErrorBody(400, "Request validation failed", "VALIDATION_ERROR", [
          { field: "picks.roundTwoPicks.east.0.0.seed", message: "Invalid", code: "invalid_string" },
          { field: "field", message: "All 68 team names must be distinct", code: "custom" },
        ])
      )
    );

    const error = await thrownBy();

    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe(
      "Failed to play tournament (400 VALIDATION_ERROR): Request validation failed " +
        "[picks.roundTwoPicks.east.0.0.seed: Invalid; field: All 68 team names must be distinct]"
    );
  });

  it("tolerates a body that is not JSON", async () => {
    respond(502, "<html>Bad gateway</html>");

    const error = await thrownBy();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(502);
    expect(error.message).toBe("Failed to play tournament (502)");
  });

  it("tolerates JSON that is not an API error", async () => {
    respond(500, JSON.stringify({ error: "boom" }));

    const error = await thrownBy();

    expect(error.message).toBe("Failed to play tournament (500)");
  });
});
