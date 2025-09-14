import "@testing-library/jest-dom";
import React from "react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { mockTeamStats, mockTeamSchedules } from "@/src/mockData";
import { PlayRegularSeasonGames } from "../PlayRegularSeasonGames";

const mockPlayGame = vi.fn(() => ({
  favoredTeam: "team1",
  underdogTeam: "team2",
  favoredScore: 85,
  underdogScore: 75,
  favoredRPI: 10,
  underdogRPI: 20,
}));
vi.mock("@/src/functions", () => ({
  delay: vi.fn(() => Promise.resolve()),
  playGame: () => mockPlayGame,
}));

vi.mock("@/src/constants", () => ({
  AMOUNT_SEASON_GAMES: 30,
  TIMER_PER_REGULAR_SEASON_GAME: 100,
}));

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      teamStats: (state = {}, action: any) => state,
      appState: (state = { selectionSunday: false }, action: any) => state,
      uiState: (state = {}, action: any) => state,
      teamSchedule: (
        state = { teamSchedules: mockTeamSchedules },
        action: any
      ) => state,
      regularSeasonRecords: (
        state = { weeksPlayed: 0, records: {} },
        action: any
      ) => state,
      tournamentPlayersPicks: (state = {}, action: any) => state,
      tournament: (state = {}, action: any) => state,
    },
    preloadedState: initialState,
  });
};

let mockWeeksPlayed = 0;
let localMockTeamSchedules = mockTeamSchedules;
const mockDispatch = vi.fn();
vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: vi.fn((selector) => {
      const state = {
        teamSchedule: { teamSchedules: localMockTeamSchedules },
        regularSeasonRecords: { weeksPlayed: mockWeeksPlayed, records: {} },
        appState: { selectionSunday: false },
      };
      return selector(state);
    }),
  };
});

describe("PlayRegularSeasonGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    const store = createMockStore();
    return render(<Provider store={store}>{component}</Provider>);
  };

  it("starts playing games when weeksPlayed is 0", async () => {
    await act(async () => {
      renderWithProvider(<PlayRegularSeasonGames teamStats={mockTeamStats} />);
      await vi.runAllTimersAsync();
    });

    expect(mockDispatch).toHaveBeenCalled();
  });

  it("does not start playing games when weeksPlayed is greater than 0", () => {
    mockWeeksPlayed = 1;

    renderWithProvider(<PlayRegularSeasonGames teamStats={mockTeamStats} />);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("activates selection Sunday when weeksPlayed equals AMOUNT_SEASON_GAMES", async () => {
    mockWeeksPlayed = 30;

    await act(async () => {
      renderWithProvider(<PlayRegularSeasonGames teamStats={mockTeamStats} />);
      await vi.runAllTimersAsync();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("appState/activateSelectionSunday"),
      })
    );
  });

  it("does not play games when teamSchedules is null", () => {
    localMockTeamSchedules = null;

    renderWithProvider(<PlayRegularSeasonGames teamStats={mockTeamStats} />);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not play games when teamStats is null", () => {
    renderWithProvider(<PlayRegularSeasonGames teamStats={null as any} />);

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
