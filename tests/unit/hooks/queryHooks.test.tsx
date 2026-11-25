import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  useConference,
  useProfile,
  useTeam,
  useTeamStatistics,
  useTopPickedTeamsByUser,
  useTournamentScoringRules,
  useUserBracketsByYearId,
  useUserStatisticsByYearId,
  useYears,
} from "@/src/hooks";
import { jsonResponse, renderQueryHook } from "./renderQueryHook";

// Pins each hook's path, query key and enabled rule (step 11 refactors them onto useApiQuery).

type QueryHookCase = {
  name: string;
  call: () => { data?: unknown; isSuccess: boolean };
  path: string;
  key: unknown[];
};

const BODY = [{ marker: "body" }];

const cases: QueryHookCase[] = [
  { name: "useYears", call: () => useYears(), path: "/api/years", key: ["years"] },
  { name: "useConference", call: () => useConference("c1"), path: "/api/conference/c1", key: ["conference", "c1"] },
  { name: "useTeam", call: () => useTeam("c1"), path: "/api/team/c1", key: ["team", "c1"] },
  { name: "useProfile", call: () => useProfile("u1"), path: "/api/profile/u1", key: ["profile", "u1"] },
  { name: "useTeamStatistics", call: () => useTeamStatistics("y1"), path: "/api/team-statistics/y1", key: ["teamStats", "y1"] },
  {
    name: "useTopPickedTeamsByUser",
    call: () => useTopPickedTeamsByUser("u1", "y1"),
    path: "/api/pick-count/u1/y1",
    key: ["topPickedTeamsByUser", "u1", "y1"],
  },
  {
    name: "useTournamentScoringRules",
    call: () => useTournamentScoringRules("y1"),
    path: "/api/tournament-scoring-rules/y1",
    key: ["tournamentScoringRuleId", "y1"],
  },
  {
    name: "useUserBracketsByYearId",
    call: () => useUserBracketsByYearId("u1", "y1"),
    path: "/api/brackets/u1/y1",
    key: ["userBracketsByYearId", "u1", "y1"],
  },
];

const disabledCases: { name: string; call: () => unknown }[] = [
  { name: "useConference('')", call: () => useConference("") },
  { name: "useTeam('')", call: () => useTeam("") },
  { name: "useProfile('')", call: () => useProfile("") },
  { name: "useProfile(undefined)", call: () => useProfile(undefined) },
  { name: "useTeamStatistics('')", call: () => useTeamStatistics("") },
  { name: "useTopPickedTeamsByUser('', y1)", call: () => useTopPickedTeamsByUser("", "y1") },
  { name: "useTopPickedTeamsByUser(u1, '')", call: () => useTopPickedTeamsByUser("u1", "") },
  { name: "useTournamentScoringRules('')", call: () => useTournamentScoringRules("") },
  { name: "useUserBracketsByYearId('', y1)", call: () => useUserBracketsByYearId("", "y1") },
  { name: "useUserBracketsByYearId(u1, '')", call: () => useUserBracketsByYearId("u1", "") },
  { name: "useUserStatisticsByYearId('', y1)", call: () => useUserStatisticsByYearId("", "y1") },
  { name: "useUserStatisticsByYearId(u1, '')", call: () => useUserStatisticsByYearId("u1", "") },
];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(async () => jsonResponse(200, BODY));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("query hooks", () => {
  it.each(cases)("$name fetches $path under its query key", async ({ call, path, key }) => {
    const { result, queryClient } = renderQueryHook(call);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(path);
    expect(result.current.data).toEqual(BODY);
    expect(queryClient.getQueryData(key)).toEqual(BODY);
  });

  it.each(disabledCases)("$name does not fetch", ({ call }) => {
    renderQueryHook(call);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useUserStatisticsByYearId fetches its path and unpacks the stats", async () => {
    const stats = { high_score: 120, total_brackets: 3 };
    fetchMock.mockImplementation(async () => jsonResponse(200, stats));

    const { result, queryClient } = renderQueryHook(() => useUserStatisticsByYearId("u1", "y1"));

    await waitFor(() => expect(result.current.isLoadingUserStatisticsByYearId).toBe(false));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/user-statistics/u1/y1");
    expect(queryClient.getQueryData(["userStatisticsByYearId", "u1", "y1"])).toEqual(stats);
    expect(result.current.highScore).toBe(120);
    expect(result.current.totalBrackets).toBe(3);
  });
});
