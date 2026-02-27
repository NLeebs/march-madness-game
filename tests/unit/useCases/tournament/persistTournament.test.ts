import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  persistTournament,
  PersistTournamentDto,
} from "@/application/useCases";
import { buildTournamentState, buildPicksState } from "@/tests/factories";

const mockGetTeamsByYearId = vi.fn();
const mockGetRounds = vi.fn();
const mockPersistBracket = vi.fn();
const mockPersistTournament = vi.fn();

vi.mock("@/infrastructure/db/TournamentRepository", () => ({
  TournamentRepository: vi.fn().mockImplementation(() => ({
    getTeamsByYearId: mockGetTeamsByYearId,
    getRounds: mockGetRounds,
    persistBracket: mockPersistBracket,
    persistTournament: mockPersistTournament,
  })),
}));

vi.mock("@/application/mappers/mapTournamentToRows", () => ({
  mapTournamentToRows: vi.fn(() => [
    {
      game: { year_id: "year-uuid", round_id: "round-uuid" },
      pick: { bracket_id: "bracket-uuid", picked_team_id: "team-uuid" },
    },
  ]),
}));

const mockTeams = [
  {
    id: "duke-uuid",
    name: "Duke",
    year_id: "year-uuid",
    conference_id: "conf-uuid",
  },
  {
    id: "unc-uuid",
    name: "UNC",
    year_id: "year-uuid",
    conference_id: "conf-uuid",
  },
];

const mockRounds = [
  { id: "r1-uuid", round_name: "1" },
  { id: "r2-uuid", round_name: "2" },
  { id: "s16-uuid", round_name: "sweet sixteen" },
  { id: "e8-uuid", round_name: "elite eight" },
  { id: "f4-uuid", round_name: "final four" },
  { id: "fin-uuid", round_name: "finals" },
  { id: "champ-uuid", round_name: "champion" },
];

function buildDto(
  overrides: Partial<PersistTournamentDto> = {},
): PersistTournamentDto {
  return {
    tournamentState: buildTournamentState({
      yearId: "year-uuid",
      tournamentScoringRulesId: "scoring-uuid",
      playerScore: 150,
    }),
    picksState: buildPicksState(),
    anonUserId: "anon-uuid",
    ...overrides,
  };
}

describe("persistTournament", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTeamsByYearId.mockResolvedValue(mockTeams);
    mockGetRounds.mockResolvedValue(mockRounds);
    mockPersistBracket.mockResolvedValue("new-bracket-uuid");
    mockPersistTournament.mockResolvedValue(undefined);
  });

  describe("successful persistence", () => {
    it("should return bracketId and success true", async () => {
      const result = await persistTournament(buildDto());

      expect(result).toEqual({
        bracketId: "new-bracket-uuid",
        success: true,
      });
    });

    it("should fetch teams by yearId", async () => {
      await persistTournament(buildDto());

      expect(mockGetTeamsByYearId).toHaveBeenCalledWith("year-uuid");
      expect(mockGetTeamsByYearId).toHaveBeenCalledTimes(1);
    });

    it("should fetch rounds", async () => {
      await persistTournament(buildDto());

      expect(mockGetRounds).toHaveBeenCalledTimes(1);
    });

    it("should persist the bracket with correct data for anonymous user", async () => {
      await persistTournament(
        buildDto({ userId: null, anonUserId: "anon-uuid" }),
      );

      expect(mockPersistBracket).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          anon_user_id: "anon-uuid",
          year_id: "year-uuid",
          tournament_scoring_rules_id: "scoring-uuid",
          score: 150,
        }),
      );
    });

    it("should persist the bracket with correct data for authenticated user", async () => {
      await persistTournament(
        buildDto({ userId: "user-uuid", anonUserId: "anon-uuid" }),
      );

      expect(mockPersistBracket).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-uuid",
          anon_user_id: null,
          year_id: "year-uuid",
          tournament_scoring_rules_id: "scoring-uuid",
          score: 150,
        }),
      );
    });

    it("should set anon_user_id to null when userId is present", async () => {
      await persistTournament(
        buildDto({ userId: "user-uuid", anonUserId: "anon-uuid" }),
      );

      const bracketArg = mockPersistBracket.mock.calls[0][0];
      expect(bracketArg.anon_user_id).toBeNull();
    });

    it("should call persistTournament on the repository with bracket and games", async () => {
      await persistTournament(buildDto());

      expect(mockPersistTournament).toHaveBeenCalledWith(
        expect.objectContaining({
          bracket: expect.objectContaining({ id: "new-bracket-uuid" }),
          gamesAndPicks: expect.any(Array),
        }),
      );
    });

    it("should call mapTournamentToRows with the bracket id from persistBracket", async () => {
      const { mapTournamentToRows } =
        await import("@/application/mappers/mapTournamentToRows");

      await persistTournament(buildDto());

      expect(mapTournamentToRows).toHaveBeenCalledWith(
        expect.objectContaining({
          bracketId: "new-bracket-uuid",
        }),
      );
    });
  });

  describe("bracket validation", () => {
    it("should throw when both userId and anonUserId are absent", async () => {
      await expect(
        persistTournament(buildDto({ userId: null, anonUserId: null })),
      ).rejects.toThrow("Anonymous brackets must have anon_user_id set.");
    });

    it("should throw when both userId and anonUserId are undefined", async () => {
      await expect(
        persistTournament(
          buildDto({ userId: undefined, anonUserId: undefined }),
        ),
      ).rejects.toThrow("Anonymous brackets must have anon_user_id set.");
    });

    it("should not call persistBracket when validation fails", async () => {
      await expect(
        persistTournament(buildDto({ userId: null, anonUserId: null })),
      ).rejects.toThrow();

      expect(mockPersistBracket).not.toHaveBeenCalled();
    });
  });

  describe("execution order", () => {
    it("should fetch teams and rounds before persisting the bracket", async () => {
      const callOrder: string[] = [];

      mockGetTeamsByYearId.mockImplementation(async () => {
        callOrder.push("getTeamsByYearId");
        return mockTeams;
      });
      mockGetRounds.mockImplementation(async () => {
        callOrder.push("getRounds");
        return mockRounds;
      });
      mockPersistBracket.mockImplementation(async () => {
        callOrder.push("persistBracket");
        return "new-bracket-uuid";
      });
      mockPersistTournament.mockImplementation(async () => {
        callOrder.push("persistTournament");
      });

      await persistTournament(buildDto());

      expect(callOrder.indexOf("getTeamsByYearId")).toBeLessThan(
        callOrder.indexOf("persistBracket"),
      );
      expect(callOrder.indexOf("getRounds")).toBeLessThan(
        callOrder.indexOf("persistBracket"),
      );
      expect(callOrder.indexOf("persistBracket")).toBeLessThan(
        callOrder.indexOf("persistTournament"),
      );
    });
  });

  describe("error propagation", () => {
    it("should propagate errors from getTeamsByYearId", async () => {
      mockGetTeamsByYearId.mockRejectedValue(
        new Error("Failed to fetch teams: connection refused"),
      );

      await expect(persistTournament(buildDto())).rejects.toThrow(
        "Failed to fetch teams",
      );

      expect(mockPersistBracket).not.toHaveBeenCalled();
    });

    it("should propagate errors from getRounds", async () => {
      mockGetRounds.mockRejectedValue(
        new Error("Failed to fetch rounds: timeout"),
      );

      await expect(persistTournament(buildDto())).rejects.toThrow(
        "Failed to fetch rounds",
      );

      expect(mockPersistBracket).not.toHaveBeenCalled();
    });

    it("should propagate errors from persistBracket", async () => {
      mockPersistBracket.mockRejectedValue(
        new Error("Failed to create bracket: RLS violation"),
      );

      await expect(persistTournament(buildDto())).rejects.toThrow(
        "Failed to create bracket",
      );

      expect(mockPersistTournament).not.toHaveBeenCalled();
    });

    it("should propagate errors from persistTournament on repository", async () => {
      mockPersistTournament.mockRejectedValue(
        new Error("Failed to insert game: constraint violation"),
      );

      await expect(persistTournament(buildDto())).rejects.toThrow(
        "Failed to insert game",
      );
    });
  });

  describe("team and round mapping", () => {
    it("should build a team id map from the fetched teams", async () => {
      const { mapTournamentToRows } =
        await import("@/application/mappers/mapTournamentToRows");

      await persistTournament(buildDto());

      const callArgs = (mapTournamentToRows as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const teamIdMap: Map<string, string> = callArgs.teamIdMap;

      expect(teamIdMap.get("Duke")).toBe("duke-uuid");
      expect(teamIdMap.get("UNC")).toBe("unc-uuid");
      expect(teamIdMap.size).toBe(2);
    });

    it("should build a round id map from the fetched rounds", async () => {
      const { mapTournamentToRows } =
        await import("@/application/mappers/mapTournamentToRows");

      await persistTournament(buildDto());

      const callArgs = (mapTournamentToRows as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const roundIdMap: Map<string | number, string> = callArgs.roundIdMap;

      expect(roundIdMap.get(1)).toBe("r1-uuid");
      expect(roundIdMap.get(2)).toBe("r2-uuid");
      expect(roundIdMap.get("sweet sixteen")).toBe("s16-uuid");
      expect(roundIdMap.get("elite eight")).toBe("e8-uuid");
      expect(roundIdMap.get("final four")).toBe("f4-uuid");
      expect(roundIdMap.get("finals")).toBe("fin-uuid");
      expect(roundIdMap.get("champion")).toBe("champ-uuid");
    });
  });
});
