import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/season/route";
import { ValidationError } from "@/utils/errorHandling";

const mockPlaySeason = vi.fn();

vi.mock("@/application/useCases", () => ({
  playSeason: (...args: unknown[]) => mockPlaySeason(...args),
}));

vi.mock("@/utils/api/allowedOrigins", () => ({
  getAllowedOrigins: () => ["http://localhost:3000"],
}));

const YEAR_ID = "123e4567-e89b-42d3-a456-426614174000";

function createRequest(
  body: unknown,
  options: { contentType?: string; origin?: string } = {}
): NextRequest {
  const { contentType = "application/json", origin = "http://localhost:3000" } =
    options;
  const headers: Record<string, string> = {};
  if (contentType) headers["content-type"] = contentType;
  if (origin) headers["origin"] = origin;
  return new NextRequest("http://localhost:3000/api/season", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/season", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    mockPlaySeason.mockResolvedValue({ yearId: YEAR_ID, fieldToken: "t" });
  });

  it("returns 200 with the use case result", async () => {
    const response = await POST(createRequest({ yearId: YEAR_ID }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ yearId: YEAR_ID, fieldToken: "t" });
    expect(mockPlaySeason).toHaveBeenCalledWith({ yearId: YEAR_ID });
  });

  it("returns 400 for a bad body", async () => {
    const response = await POST(createRequest({ yearId: "2024" }));
    expect(response.status).toBe(400);
    expect(mockPlaySeason).not.toHaveBeenCalled();
  });

  it("returns 400 when content-type is not application/json", async () => {
    const response = await POST(
      createRequest({ yearId: YEAR_ID }, { contentType: "text/plain" })
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toContain("Content-Type");
  });

  it("returns 400 when the origin is not allowed", async () => {
    const response = await POST(
      createRequest({ yearId: YEAR_ID }, { origin: "http://evil.example" })
    );
    expect(response.status).toBe(400);
    expect(mockPlaySeason).not.toHaveBeenCalled();
  });

  it("returns 400 when the use case throws ValidationError", async () => {
    mockPlaySeason.mockRejectedValue(new ValidationError("Unknown year"));
    const response = await POST(createRequest({ yearId: YEAR_ID }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("Unknown year");
  });

  it("returns the 500 error shape on a generic error", async () => {
    mockPlaySeason.mockRejectedValue(new Error("boom"));
    const response = await POST(createRequest({ yearId: YEAR_ID }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: "boom",
          statusCode: 500,
          path: "/api/season",
        }),
      })
    );
  });
});
