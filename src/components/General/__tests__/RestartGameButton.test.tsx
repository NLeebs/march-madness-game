import "@testing-library/jest-dom";
import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { RestartGameButton } from "../RestartGameButton";
import { PRIMARY_COLOR } from "@/src/constants";
import userEvent from "@testing-library/user-event";

beforeAll(() => {
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: An update to") &&
      args[0].includes("was not wrapped in act")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

vi.mock("@/src/components", () => ({
  Button: ({ onClick, text, backgroundColor, disabled = false }: any) => (
    <button
      type="button"
      data-testid="mock-button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ backgroundColor }}
    >
      {text}
    </button>
  ),
}));

const mockDispatch = vi.fn();

const mockYears = [
  { id: "year-2024-uuid" },
  { id: "year-2025-uuid" },
];

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      appState: (state = {}, action: any) => state,
      uiState: (state = {}, action: any) => state,
      teamSchedule: (state = {}, action: any) => state,
      regularSeasonRecord: (state = {}, action: any) => state,
      tournamentPlayersPicks: (state = {}, action: any) => state,
      tournament: (state = {}, action: any) => state,
      teamStats: (state = {}, action: any) => state,
    },
    preloadedState: initialState,
  });
};

vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

describe("RestartGameButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockYears),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    const store = createMockStore();
    return render(<Provider store={store}>{component}</Provider>);
  };

  it("renders the restart button with correct text", () => {
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Play Again");
  });

  it("renders button with correct background color", () => {
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    expect(button).toHaveStyle({ backgroundColor: PRIMARY_COLOR });
  });

  it("changes button text and disables during restart", async () => {
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");

    expect(button).toHaveTextContent("Play Again");
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    expect(button).toHaveTextContent("Restarting...");
    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(button).toHaveTextContent("Play Again");
      expect(button).not.toBeDisabled();
    });
  });

  it("dispatches all restart actions when clicked", () => {
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    fireEvent.click(button);

    expect(mockDispatch).toHaveBeenCalledTimes(7);
    expect(mockDispatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: expect.stringContaining("appState/restartGame"),
      })
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: expect.stringContaining("uiState/restartGame"),
      })
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: expect.stringContaining("teamSchedule/restartGame"),
      })
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        type: expect.stringContaining("regularSeasonRecords/restartGame"),
      })
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        type: expect.stringContaining("tournamentPlayersPicks/restartGame"),
      })
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({
        type: expect.stringContaining("tournament/restartGame"),
      })
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({
        type: expect.stringContaining("teamStats/restartGame"),
      })
    );
  });

  it("fetches years from API after dispatching restart actions", async () => {
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/years");
    });
  });

  it("dispatches setYearId with latest year after successful fetch", async () => {
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining("tournament/setYearId"),
          payload: "year-2025-uuid",
        })
      );
    });

    expect(mockDispatch).toHaveBeenCalledTimes(8);
  });

  it("prevents multiple rapid clicks during restart", async () => {
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");

    fireEvent.click(button);
    expect(mockDispatch).toHaveBeenCalledTimes(7);

    userEvent.click(button);
    expect(mockDispatch).toHaveBeenCalledTimes(7);
  });

  it("does not dispatch setYearId when fetch returns empty years", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/years");
    });

    expect(mockDispatch).toHaveBeenCalledTimes(7);
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("tournament/setYearId"),
      })
    );
  });

  it("handles fetch failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    fireEvent.click(button);

    expect(mockDispatch).toHaveBeenCalledTimes(7);

    await waitFor(() => {
      expect(button).toHaveTextContent("Play Again");
      expect(button).not.toBeDisabled();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to set default year on restart:",
      expect.any(Error)
    );
    expect(mockDispatch).toHaveBeenCalledTimes(7);

    consoleSpy.mockRestore();
  });

  it("button has proper accessibility attributes", () => {
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    button.focus();

    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveFocus();
  });
});
