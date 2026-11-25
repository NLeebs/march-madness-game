import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { useApiQuery } from "@/src/hooks/useApiQuery";
import { jsonResponse, renderQueryHook } from "./renderQueryHook";

const YEARS = [{ id: "y1", year: 2025 }];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useApiQuery", () => {
  it("fetches the path and returns the data", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, YEARS));

    const { result } = renderQueryHook(() =>
      useApiQuery<typeof YEARS>(["years"], "/api/years", "fetch years"),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(YEARS);
    expect(fetchMock).toHaveBeenCalledWith("/api/years");
  });

  it("stores the data under the given query key", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, YEARS));

    const { result, queryClient } = renderQueryHook(() =>
      useApiQuery<typeof YEARS>(["years"], "/api/years", "fetch years"),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(["years"])).toEqual(YEARS);
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderQueryHook(() =>
      useApiQuery(["years"], "/api/years", "fetch years", { enabled: false }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("surfaces the apiError on failure", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: { message: "nope" } }));

    const { result } = renderQueryHook(() =>
      useApiQuery(["team", "t1"], "/api/team/t1", "fetch team"),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to fetch team (404): nope");
  });
});
