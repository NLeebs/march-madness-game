import React from "react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { GameDataError } from "@/src/functions/generic";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import { createFastStore } from "@/tests/game/helpers/fastStore";
import { SelectionSunday } from "../SelectionSunday";

class CatchError extends React.Component<
  { onError: (error: unknown) => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

describe("SelectionSunday", () => {
  afterEach(() => cleanup());

  it("throws GameDataError when no season is stored", () => {
    const seedStore = createFastStore();
    configureStoreForLeague(seedStore, buildLeague());
    const base = seedStore.getState();
    const store = createFastStore({
      preloadedState: {
        ...base,
        regularSeasonRecords: { ...base.regularSeasonRecords, weeksPlayed: 30 },
        appState: { ...base.appState, selectionSunday: true },
      },
    });
    const onError = vi.fn();
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(
        <Provider store={store}>
          <CatchError onError={onError}>
            <SelectionSunday />
          </CatchError>
        </Provider>
      );
    } finally {
      quiet.mockRestore();
    }

    expect(onError).toHaveBeenCalledTimes(1);
    const error = onError.mock.calls[0][0];
    expect(error).toBeInstanceOf(GameDataError);
    expect((error as Error).message).toBe("no season results");
    expect(store.getState().tournament.tournamentTeams).toEqual([]);
  });
});
