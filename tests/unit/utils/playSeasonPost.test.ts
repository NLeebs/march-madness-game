import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playSeasonPost } from "@/src/utils/playSeasonPost";
import { AppError } from "@/utils/errorHandling";

const YEAR_ID = "11111111-1111-4111-8111-111111111111";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const respond = (status: number, body: string) =>
  fetchMock.mockResolvedValue(
    new Response(body, { status, headers: { "Content-Type": "application/json" } })
  );

async function thrownBy(): Promise<AppError> {
  try {
    await playSeasonPost({ yearId: YEAR_ID });
  } catch (e) {
    return e as AppError;
  }
  throw new Error("playSeasonPost did not throw");
}

describe("playSeasonPost", () => {
  it("posts the yearId as JSON to /api/season and returns the body", async () => {
    const result = { yearId: YEAR_ID, teams: [], weeks: [], fieldToken: "t" };
    respond(200, JSON.stringify(result));

    await expect(playSeasonPost({ yearId: YEAR_ID })).resolves.toEqual(result);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/season");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ yearId: YEAR_ID });
  });

  it("throws an AppError carrying the server's message, status and code", async () => {
    respond(
      400,
      JSON.stringify({
        success: false,
        error: { message: `Unknown year: ${YEAR_ID}`, code: "VALIDATION_ERROR", statusCode: 400 },
      })
    );

    const error = await thrownBy();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe(
      `Failed to play season (400 VALIDATION_ERROR): Unknown year: ${YEAR_ID}`
    );
  });

  it("falls back to the status when the body is not handleApiError's JSON", async () => {
    respond(502, "<html>Bad gateway</html>");

    const error = await thrownBy();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(502);
    expect(error.message).toBe("Failed to play season (502)");
  });
});
