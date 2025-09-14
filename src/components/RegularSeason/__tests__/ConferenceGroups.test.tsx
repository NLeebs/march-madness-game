import "@testing-library/jest-dom";
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ConferenceGroups } from "../ConferenceGroups";

vi.mock("@/src/components", () => ({
  TeamBar: ({ team }: { team: string }) => (
    <div data-testid={`team-${team}`}>{team}</div>
  ),
}));

const mockAppState = {
  transition: false,
  selectionSunday: false,
};

const mockRegularSeasonRecords = {
  "1": { wins: 10, losses: 2, tournamentSelectionScore: 0 },
  "2": { wins: 8, losses: 4, tournamentSelectionScore: 0 },
  "3": { wins: 12, losses: 1, tournamentSelectionScore: 0 },
  "4": { wins: 8, losses: 4, tournamentSelectionScore: 0 },
};

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      teamStats: (state = {}, action: any) => state,
      appState: (state = mockAppState, action: any) => state,
      uiState: (state = {}, action: any) => state,
      teamSchedule: (state = {}, action: any) => state,
      regularSeasonRecords: (
        state = { weeksPlayed: 0, records: mockRegularSeasonRecords },
        action: any
      ) => state,
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
    useSelector: vi.fn((selector) => {
      const state = {
        appState: mockAppState,
        regularSeasonRecords: {
          weeksPlayed: 0,
          records: mockRegularSeasonRecords,
        },
      };
      return selector(state);
    }),
  };
});

describe("ConferenceGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    const store = createMockStore();
    return render(<Provider store={store}>{component}</Provider>);
  };

  it("renders the conference groups with multiple teams", () => {
    const { getByTestId } = renderWithProvider(
      <ConferenceGroups
        conferenceTeams={{ "1": {}, "2": {}, "3": {}, "4": {} }}
        isPowerConf="false"
      />
    );
    expect(getByTestId("team-1")).toBeInTheDocument();
    expect(getByTestId("team-2")).toBeInTheDocument();
    expect(getByTestId("team-3")).toBeInTheDocument();
    expect(getByTestId("team-4")).toBeInTheDocument();
  });

  it("renders with single team", () => {
    const { getByTestId } = renderWithProvider(
      <ConferenceGroups conferenceTeams={{ "1": {} }} isPowerConf="false" />
    );
    expect(getByTestId("team-1")).toBeInTheDocument();
  });

  it("renders with empty conference teams", () => {
    const { container } = renderWithProvider(
      <ConferenceGroups conferenceTeams={{}} isPowerConf="false" />
    );
    expect(container.firstChild).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid^="team-"]')
    ).not.toBeInTheDocument();
  });

  it("sorts teams by wins in descending order", () => {
    const { getAllByTestId } = renderWithProvider(
      <ConferenceGroups
        conferenceTeams={{ "1": {}, "2": {}, "3": {}, "4": {} }}
        isPowerConf="false"
      />
    );

    const teamElements = getAllByTestId(/^team-/);
    const teamOrder = teamElements.map((el) => el.textContent);

    // Should be sorted by wins: 3(12), 1(10), 2(8), 4(8)
    expect(teamOrder).toEqual(["3", "1", "2", "4"]);
  });

  it("maintains stable order for teams with equal wins", () => {
    const { getAllByTestId } = renderWithProvider(
      <ConferenceGroups
        conferenceTeams={{ "2": {}, "4": {} }}
        isPowerConf="false"
      />
    );

    const teamElements = getAllByTestId(/^team-/);
    const teamOrder = teamElements.map((el) => el.textContent);

    // Both have 8 wins, should maintain original order
    expect(teamOrder).toEqual(["2", "4"]);
  });

  it("shows power conference on all screen sizes", () => {
    const { container } = renderWithProvider(
      <ConferenceGroups
        conferenceTeams={{ "1": {}, "2": {} }}
        isPowerConf="true"
      />
    );

    const conferenceDiv = container.firstChild as HTMLElement;
    expect(conferenceDiv.className).not.toContain("lg:flex hidden");
  });

  it("hides non-power conference on large screens", () => {
    const { container } = renderWithProvider(
      <ConferenceGroups
        conferenceTeams={{ "1": {}, "2": {} }}
        isPowerConf="false"
      />
    );

    const conferenceDiv = container.firstChild as HTMLElement;
    expect(conferenceDiv.className).toContain("lg:flex hidden");
  });

  it("shows when transition is false and selectionSunday is false", () => {
    const { container } = renderWithProvider(
      <ConferenceGroups
        conferenceTeams={{ "1": {}, "2": {} }}
        isPowerConf="false"
      />
    );

    const conferenceDiv = container.firstChild as HTMLElement;
    expect(conferenceDiv.className).toContain("opacity-100");
  });

  it("shows when transition is true but selectionSunday is true", () => {
    const mockStoreWithSelectionSunday = createMockStore({
      appState: { transition: true, selectionSunday: true },
    });

    const { container } = render(
      <Provider store={mockStoreWithSelectionSunday}>
        <ConferenceGroups
          conferenceTeams={{ "1": {}, "2": {} }}
          isPowerConf="false"
        />
      </Provider>
    );

    const conferenceDiv = container.firstChild as HTMLElement;
    expect(conferenceDiv.className).toContain("opacity-100");
  });

  it("hides when transition is true and selectionSunday is false", () => {
    const mockStoreWithTransition = createMockStore({
      appState: { transition: true, selectionSunday: false },
    });

    const { container } = render(
      <Provider store={mockStoreWithTransition}>
        <ConferenceGroups
          conferenceTeams={{ "1": {}, "2": {} }}
          isPowerConf="false"
        />
      </Provider>
    );

    const conferenceDiv = container.firstChild as HTMLElement;
    expect(conferenceDiv.className).toContain("opacity-0");
  });

  it("handles empty records object", () => {
    const mockStoreWithEmptyRecords = createMockStore({
      regularSeasonRecords: {
        weeksPlayed: 0,
        records: {},
      },
    });

    const { container } = render(
      <Provider store={mockStoreWithEmptyRecords}>
        <ConferenceGroups
          conferenceTeams={{ "1": {}, "2": {} }}
          isPowerConf="false"
        />
      </Provider>
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies correct base classes", () => {
    const { container } = renderWithProvider(
      <ConferenceGroups
        conferenceTeams={{ "1": {}, "2": {} }}
        isPowerConf="false"
      />
    );

    const conferenceDiv = container.firstChild as HTMLElement;
    expect(conferenceDiv.className).toContain("max-w-300");
    expect(conferenceDiv.className).toContain("flex");
    expect(conferenceDiv.className).toContain("flex-row");
    expect(conferenceDiv.className).toContain("flex-wrap");
    expect(conferenceDiv.className).toContain("gap-4");
    expect(conferenceDiv.className).toContain("p-8");
    expect(conferenceDiv.className).toContain("bg-slate-50");
    expect(conferenceDiv.className).toContain("transition-opacity");
    expect(conferenceDiv.className).toContain("duration-500");
  });
});
