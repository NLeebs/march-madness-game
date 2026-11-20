import "@testing-library/jest-dom";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/src/components/Context/AuthProvider";
import { GameErrorBoundary } from "@/src/components/General/GameErrorBoundary";
import type { AppStore } from "@/store";
import { compactSeason, expandSeason } from "@/src/functions/regularSeason/seasonWire";
import { simulateSeason } from "@/src/functions/regularSeason/simulateSeason";
import type { PlaySeasonResult } from "@/application/useCases/season/PlaySeason";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import { createFastStore } from "@/tests/game/helpers/fastStore";
import { mulberry32 } from "@/tests/game/helpers/rng";
import { GAME_TEST_TIMEOUT } from "@/tests/game/helpers/timeout";

vi.mock("@/src/utils/crashReporting", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/utils/crashReporting")>();
  return { ...actual, reportCrash: vi.fn() };
});

import { reportCrash } from "@/src/utils/crashReporting";
import { useRethrowPlaySeasonError } from "@/src/hooks/usePlaySeason";
import { StartButton } from "../StartButton";

const YEAR_ID = "11111111-1111-4111-8111-111111111111";

const league = buildLeague();
const wire = compactSeason(simulateSeason(league.teamStats, mulberry32(3)));
const RESULT: PlaySeasonResult = { ...wire, yearId: YEAR_ID, fieldToken: "test-token" };

function leagueStore(): AppStore {
  const store = createFastStore();
  configureStoreForLeague(store, league);
  return store;
}

/** Mounts StartButton while `showButton`; the season-error hook stays mounted, as in App. */
function Harness({ showButton }: { showButton: boolean }) {
  useRethrowPlaySeasonError();
  return showButton ? <StartButton yearId={YEAR_ID} tournamentScoringRuleId="rules" /> : null;
}

function renderButton(store: AppStore) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const authValue = { user: null, loading: false } as unknown as null;
  const ui = (showButton: boolean) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <GameErrorBoundary>
            <Harness showButton={showButton} />
          </GameErrorBoundary>
        </AuthContext.Provider>
      </QueryClientProvider>
    </Provider>
  );
  const view = render(ui(true));
  return { ...view, hideButton: () => view.rerender(ui(false)) };
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const errorBody = {
  success: false,
  error: {
    message: "Failed to load team stats: timeout",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
    timestamp: "2026-11-20T00:00:00.000Z",
    path: "/api/season",
  },
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const startButton = () => screen.getByRole("button", { name: "Start the game" });

describe("StartButton", () => {
  it(
    "Start posts the yearId to /api/season and stores the season and token",
    async () => {
      const store = leagueStore();
      fetchMock.mockResolvedValue(jsonResponse(200, RESULT));
      renderButton(store);

      fireEvent.click(startButton());

      // the transition starts with the request, as before
      expect(store.getState().appState.transition).toBe(true);
      await waitFor(() => expect(store.getState().regularSeasonRecords.season).not.toBeNull());
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("/api/season");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({ yearId: YEAR_ID });

      const expanded = expandSeason(wire, league.teamStats);
      const state = store.getState();
      expect(state.regularSeasonRecords.season).toEqual({
        weeks: expanded.weeks,
        selection: wire.selection,
      });
      expect(state.tournament.fieldToken).toBe("test-token");
      const scheduled = Object.values(state.teamSchedule.teamSchedules).flat().length;
      expect(scheduled).toBe(expanded.schedule.length);
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "a second Start click sends no second season request",
    async () => {
      const store = leagueStore();
      fetchMock.mockReturnValue(new Promise<Response>(() => {}));
      renderButton(store);

      fireEvent.click(startButton());
      fireEvent.click(startButton());
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "stores the season even when the start screen is gone before the response",
    async () => {
      const store = leagueStore();
      let respond: (r: Response) => void = () => {};
      fetchMock.mockReturnValue(new Promise<Response>((resolve) => (respond = resolve)));
      const { hideButton } = renderButton(store);

      fireEvent.click(startButton());
      hideButton();
      respond(jsonResponse(200, RESULT));

      await waitFor(() => expect(store.getState().regularSeasonRecords.season).not.toBeNull());
      expect(store.getState().tournament.fieldToken).toBe("test-token");
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "a failed season request shows the crash screen and reports the crash",
    async () => {
      const store = leagueStore();
      fetchMock.mockResolvedValue(jsonResponse(500, errorBody));
      const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        renderButton(store);
        fireEvent.click(startButton());

        expect(
          await screen.findByRole("heading", { name: "Something went wrong" })
        ).toBeInTheDocument();
        expect(reportCrash).toHaveBeenCalledTimes(1);
        expect(reportCrash).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 500,
            message: "Failed to play season (500 UNKNOWN_ERROR): Failed to load team stats: timeout",
          }),
          expect.objectContaining({ boundary: "game" })
        );
        expect(store.getState().regularSeasonRecords.season).toBeNull();
      } finally {
        quiet.mockRestore();
      }
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "a season request that fails after the start screen is gone still shows the crash screen",
    async () => {
      const store = leagueStore();
      let respond: (r: Response) => void = () => {};
      fetchMock.mockReturnValue(new Promise<Response>((resolve) => (respond = resolve)));
      const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const { hideButton } = renderButton(store);
        fireEvent.click(startButton());
        hideButton();
        respond(jsonResponse(500, errorBody));

        expect(
          await screen.findByRole("heading", { name: "Something went wrong" })
        ).toBeInTheDocument();
        expect(reportCrash).toHaveBeenCalledTimes(1);
      } finally {
        quiet.mockRestore();
      }
    },
    GAME_TEST_TIMEOUT
  );
});
