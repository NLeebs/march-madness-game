import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { useMadnessPrep } from "@/src/hooks";
import { jsonResponse, renderQueryHook } from "./renderQueryHook";

// Pins each dashboard query's path, query key and returned field names.
const ROWS = [
  ["topPerformingTeams", "isLoadingMadnessPrep", "/api/teams/top-performers"],
  ["topPerformingNonPowerConferenceTeams", "isLoadingTopPerformingNonPowerConferenceTeams", "/api/teams/top-performers/non-power-conference"],
  ["topPickedTeams", "isLoadingTopPickedTeams", "/api/teams/most-picked"],
  ["teamsThatCausedMostUpsets", "isLoadingTeamsThatCausedMostUpsets", "/api/teams/upsets/caused"],
  ["teamsMostUpsetProne", "isLoadingTeamsMostUpsetProne", "/api/teams/upsets/prone"],
  ["firstRoundSeedMatchupUpsetPercentages", "isLoadingFirstRoundSeedMatchupUpsetPercentages", "/api/seeds/first-round/upset-percentage"],
  ["teamsWithMostChampionships", "isLoadingTeamsWithMostChampionships", "/api/teams/appearances/championships"],
  ["teamsInMostFinals", "isLoadingTeamsInMostFinals", "/api/teams/appearances/finals"],
  ["teamsInMostFinalFours", "isLoadingTeamsInMostFinalFours", "/api/teams/appearances/final-fours"],
  ["teamsInMostEliteEights", "isLoadingTeamsInMostEliteEights", "/api/teams/appearances/elite-eights"],
  ["teamsInMostSweetSixteens", "isLoadingTeamsInMostSweetSixteens", "/api/teams/appearances/sweet-sixteens"],
  ["teamsInMostSecondRounds", "isLoadingTeamsInMostSecondRounds", "/api/teams/appearances/second-rounds"],
  ["teamsWithMostTournamentAppearances", "isLoadingTeamsWithMostTournamentAppearances", "/api/teams/appearances"],
] as const;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(async (url: string) => jsonResponse(200, [{ marker: url }]));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMadnessPrep", () => {
  it("fetches every dashboard query under its key and returns it by name", async () => {
    const { result, queryClient } = renderQueryHook(() => useMadnessPrep("y1"));
    const current = () => result.current as unknown as Record<string, unknown>;

    await waitFor(() => {
      for (const [, loadingField] of ROWS) expect(current()[loadingField]).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledTimes(ROWS.length);
    for (const [dataField, , path] of ROWS) {
      const body = [{ marker: `${path}/y1` }];
      expect(fetchMock).toHaveBeenCalledWith(`${path}/y1`);
      expect(current()[dataField]).toEqual(body);
      expect(queryClient.getQueryData([dataField, "y1"])).toEqual(body);
    }
  });

  it("returns exactly the data and loading fields", () => {
    const { result } = renderQueryHook(() => useMadnessPrep("y1"));

    expect(Object.keys(result.current).sort()).toEqual(ROWS.flatMap(([data, loading]) => [data, loading]).sort());
  });

  it("does not fetch without a year", () => {
    renderQueryHook(() => useMadnessPrep(""));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
