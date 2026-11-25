import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRestartTheGame } from "@/src/hooks/useRestartTheGame";
import { tournamentActions } from "@/store";
import { AppError } from "@/utils/errorHandling";
import { jsonResponse } from "./renderQueryHook";

const dispatch = vi.fn();

vi.mock("react-redux", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-redux")>()),
  useDispatch: () => dispatch,
}));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  dispatch.mockClear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useRestartTheGame", () => {
  it("sets the latest year after restart", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, [
        { id: "a", year: 2024 },
        { id: "b", year: 2025 },
      ]),
    );
    const { result } = renderHook(() => useRestartTheGame());

    await result.current.restartTheGame();

    expect(fetchMock).toHaveBeenCalledWith("/api/years");
    expect(dispatch).toHaveBeenCalledWith(tournamentActions.setYearId("b"));
  });

  it("finishes the restart when the years request fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, "oops"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useRestartTheGame());

    await expect(result.current.restartTheGame()).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledTimes(1);
    const [label, error] = consoleError.mock.calls[0];
    expect(label).toBe("Failed to set default year on restart:");
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).message).toMatch(/^Failed to fetch years \(500\)/);
  });
});
