import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiGet } from "@/src/utils/apiGet";
import { AppError } from "@/utils/errorHandling";

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
    new Response(body, { status, headers: { "Content-Type": "application/json" } }),
  );

async function thrownBy(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  throw new Error("apiGet did not throw");
}

describe("apiGet", () => {
  it("returns the parsed JSON body on 200", async () => {
    respond(200, '[{"id":"y1","year":2025}]');

    const result = await apiGet<{ id: string; year: number }[]>("/api/years", "fetch years");

    expect(result).toEqual([{ id: "y1", year: 2025 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/years");
  });

  it("throws an AppError carrying the server's reason", async () => {
    respond(500, '{"error":{"message":"db down","code":"DB_ERROR"}}');

    const error = await thrownBy(apiGet("/api/years", "fetch years"));

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(500);
    expect((error as AppError).message).toBe("Failed to fetch years (500 DB_ERROR): db down");
  });

  it("throws an AppError when the error body is not JSON", async () => {
    respond(502, "<html>bad gateway</html>");

    const error = await thrownBy(apiGet("/api/years", "fetch years"));

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(502);
    expect((error as AppError).message).toBe("Failed to fetch years (502)");
  });

  it("lets a network failure through unchanged", async () => {
    const networkError = new TypeError("Failed to fetch");
    fetchMock.mockRejectedValue(networkError);

    const error = await thrownBy(apiGet("/api/years", "fetch years"));

    expect(error).toBe(networkError);
  });
});
