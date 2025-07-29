import "@testing-library/jest-dom";
import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { RestartGameButton } from "../RestartGameButton";
import { PRIMARY_COLOR, TIMER_BETWEEN_APP_STATES } from "@/src/constants";
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

vi.mock("@/src/functions", () => ({
  delay: vi.fn(() => new Promise<void>((resolve) => resolve())),
}));

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
const mockTeamStats = [
  { id: "1", name: "Team A", conference: "acc" },
  { id: "2", name: "Team B", conference: "bigTen" },
];

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      teamStats: (state = { teamStats: mockTeamStats }, action: any) => state,
      appState: (state = {}, action: any) => state,
      uiState: (state = {}, action: any) => state,
      teamSchedule: (state = {}, action: any) => state,
      regularSeasonRecord: (state = {}, action: any) => state,
      tournamentPlayersPicks: (state = {}, action: any) => state,
      tournament: (state = {}, action: any) => state,
    },
    preloadedState: initialState,
  });
};

vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: vi.fn((selector) => {
      const state = {
        teamStats: { teamStats: mockTeamStats },
      };
      return selector(state);
    }),
  };
});

describe("RestartGameButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("dispatches all restart actions when clicked", async () => {
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    fireEvent.click(button);

    expect(mockDispatch).toHaveBeenCalledTimes(6);
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
  });

  it("calls delay function with correct timer value", async () => {
    const { delay } = await import("@/src/functions");
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    fireEvent.click(button);

    expect(delay).toHaveBeenCalledWith(TIMER_BETWEEN_APP_STATES);
  });

  it("dispatches configuration actions after delay", async () => {
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    fireEvent.click(button);

    await waitFor(
      () => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: expect.stringContaining("teamSchedule/teamScheduleConfig"),
            payload: mockTeamStats,
          })
        );
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: expect.stringContaining(
              "regularSeasonRecords/regularSeasonRecordConfig"
            ),
            payload: mockTeamStats,
          })
        );
      },
      { timeout: 1000 }
    );
    expect(mockDispatch).toHaveBeenCalledTimes(8);
  });

  it("prevents multiple rapid clicks during restart", async () => {
    const { delay } = await import("@/src/functions");
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");

    await fireEvent.click(button);
    expect(delay).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledTimes(6);

    userEvent.click(button);
    expect(delay).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledTimes(6);
  });

  it("selects teamStats from Redux state correctly", async () => {
    const { useSelector } = await import("react-redux");

    renderWithProvider(<RestartGameButton />);

    expect(useSelector).toHaveBeenCalledWith(expect.any(Function));

    const selector = (useSelector as any).mock.calls[0][0];
    const mockState = { teamStats: { teamStats: mockTeamStats } };
    const result = selector(mockState);
    expect(result).toEqual(mockTeamStats);
  });

  it("handles delay rejection gracefully", async () => {
    const { delay } = await import("@/src/functions");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (delay as any).mockRejectedValueOnce(new Error("Delay failed"));
    const { getByTestId } = renderWithProvider(<RestartGameButton />);

    const button = getByTestId("mock-button");
    fireEvent.click(button);

    expect(mockDispatch).toHaveBeenCalledTimes(6);
    await waitFor(() => {
      expect(button).toHaveTextContent("Play Again");
      expect(button).not.toBeDisabled();
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Restart failed:",
      expect.any(Error)
    );
    expect(mockDispatch).toHaveBeenCalledTimes(6);

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
