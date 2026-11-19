import "@testing-library/jest-dom";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/src/components/Context/AuthProvider";
import { GameErrorBoundary } from "@/src/components/General/GameErrorBoundary";
import { appStateActions, tournamentActions } from "@/store";
import type { AppStore } from "@/store";
import { SelectionSunday } from "@/src/components/RegularSeason/SelectionSunday";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import { createFastStore } from "@/tests/game/helpers/fastStore";
import { buildRecords, pickChalk } from "@/tests/game/helpers/runGame";
import { renderWithStore } from "@/tests/game/helpers/renderWithStore";
import { GAME_TEST_TIMEOUT } from "@/tests/game/helpers/timeout";
import type { TournamentPlayResult } from "@/src/functions/tournament/simulateTournament";

vi.mock("@/src/utils/crashReporting", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/utils/crashReporting")>();
  return { ...actual, reportCrash: vi.fn() };
});

import { reportCrash } from "@/src/utils/crashReporting";
import { PlayTournamentButton } from "../PlayTournamentButton";

const YEAR_ID = "11111111-1111-4111-8111-111111111111";
const ANON_KEY = "test-anon-key-storage";
const ANON_ID = "22222222-2222-4222-8222-222222222222";

const league = buildLeague();
const champions = Object.values(league.conferenceArrays).map((teams) => teams[0]);

/** A real store at the bracket-picking stage, with every pick made (chalk). */
function chalkStore(): AppStore {
  const records = buildRecords(league, (team, i) => ({
    wins: champions.includes(team) ? 20 : 10,
    score: 1000 - ((i * 37) % 360),
  }));
  const seedStore = createFastStore();
  configureStoreForLeague(seedStore, league);
  const base = seedStore.getState();
  const store = createFastStore({
    preloadedState: {
      ...base,
      regularSeasonRecords: { weeksPlayed: 30, records },
      appState: { ...base.appState, selectionSunday: true },
    },
  });
  renderWithStore(<SelectionSunday />, store).unmount();
  store.dispatch(tournamentActions.setYearId(YEAR_ID));
  store.dispatch(appStateActions.activateTournament());
  store.dispatch(appStateActions.activateTournamentSelectionStage());
  store.dispatch(tournamentActions.setRoundOneMatchups());
  pickChalk(store);
  return store;
}

const RESULT: TournamentPlayResult & { bracketId: string } = {
  playin: [{ gameIndex: 0, winningTeam: "A", seedType: "elevenSeeds", winningScore: 70, losingScore: 60 }],
  rounds: { 1: [], 2: [], "sweet sixteen": [], "elite eight": [], "final four": [], finals: [] },
  roundPoints: { 1: 10, 2: 20, "sweet sixteen": 0, "elite eight": 0, "final four": 0, finals: 0 },
  score: 30,
  bracketId: "33333333-3333-4333-8333-333333333333",
};

function renderButton(store: AppStore) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const authValue = { user: null, loading: false } as unknown as null;
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <GameErrorBoundary>
            <PlayTournamentButton />
          </GameErrorBoundary>
        </AuthContext.Provider>
      </QueryClientProvider>
    </Provider>
  );
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_BROWSER_ANON_KEY", ANON_KEY);
  localStorage.setItem(ANON_KEY, ANON_ID);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

const submitButton = () => screen.getByRole("button", { name: "Submit Picks" });

describe("PlayTournamentButton", () => {
  it(
    "posts yearId, field, picks and anonUserId, then stores the result and starts the play-in phase",
    async () => {
      const store = chalkStore();
      fetchMock.mockResolvedValue(jsonResponse(201, RESULT));
      renderButton(store);

      fireEvent.click(submitButton());

      await waitFor(() =>
        expect(store.getState().appState.tournamentPlayPlayinGames).toBe(true)
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("/api/bracket/simulation");
      expect(init.method).toBe("POST");
      const { tournament, tournamentPlayersPicks } = store.getState();
      expect(JSON.parse(init.body as string)).toEqual({
        yearId: YEAR_ID,
        field: {
          tournamentTeams: tournament.tournamentTeams,
          playinTeams: tournament.playinTeams,
        },
        picks: tournamentPlayersPicks.picks,
        anonUserId: ANON_ID,
      });
      const { bracketId: _bracketId, ...played } = RESULT;
      expect(tournament.simulation).toEqual(played);
      expect(store.getState().appState.tournamentSelection).toBe(false);
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "phase does not advance while pending",
    async () => {
      const store = chalkStore();
      let respond: (r: Response) => void = () => {};
      fetchMock.mockReturnValue(new Promise<Response>((resolve) => (respond = resolve)));
      renderButton(store);

      fireEvent.click(submitButton());

      const pending = await screen.findByRole("button", { name: "Tipping off..." });
      expect(pending).toBeDisabled();
      expect(store.getState().appState.tournamentSelection).toBe(true);
      expect(store.getState().appState.tournamentPlayPlayinGames).toBe(false);
      expect(store.getState().tournament.simulation).toBeNull();

      respond(jsonResponse(201, RESULT));
      await waitFor(() =>
        expect(store.getState().appState.tournamentPlayPlayinGames).toBe(true)
      );
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "second click while pending sends no second request",
    async () => {
      const store = chalkStore();
      fetchMock.mockReturnValue(new Promise<Response>(() => {}));
      renderButton(store);

      const button = submitButton();
      fireEvent.click(button);
      fireEvent.click(button);
      const pending = await screen.findByRole("button", { name: "Tipping off..." });
      fireEvent.click(pending);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "a failed request shows the crash screen and reports the crash",
    async () => {
      const store = chalkStore();
      fetchMock.mockResolvedValue(jsonResponse(500, { error: "boom" }));
      const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        renderButton(store);
        fireEvent.click(submitButton());

        expect(
          await screen.findByRole("heading", { name: "Something went wrong" })
        ).toBeInTheDocument();
        expect(reportCrash).toHaveBeenCalledTimes(1);
        expect(reportCrash).toHaveBeenCalledWith(
          expect.objectContaining({ statusCode: 500 }),
          expect.objectContaining({ boundary: "game" })
        );
        expect(store.getState().appState.tournamentPlayPlayinGames).toBe(false);
        expect(store.getState().tournament.simulation).toBeNull();
      } finally {
        quiet.mockRestore();
      }
    },
    GAME_TEST_TIMEOUT
  );
});
