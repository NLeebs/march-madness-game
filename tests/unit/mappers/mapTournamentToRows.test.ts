import { describe, it, expect } from "vitest";
import {
  mapTournamentToRows,
  MappedRowsResult,
} from "@/application/mappers/mapTournamentToRows";
import { TournamentRound, TournamentRoundMatchups } from "@/types";
import {
  buildTournamentTeam as makeTeam,
  buildMatchup as makeMatchup,
  buildEmptyRoundMatchups as emptyRoundMatchups,
  buildEmptyRegionPicks as emptyRegionPicks,
  buildTeamIdMap as makeTeamIdMap,
  buildRoundIdMap,
  buildTournamentState as makeEmptyTournamentState,
  buildPicksState as makeEmptyPicksState,
} from "@/tests/factories";

const YEAR_ID = "year-uuid-1";
const BRACKET_ID = "bracket-uuid-1";
const ROUND_IDS = buildRoundIdMap();

describe("mapTournamentToRows", () => {
  describe("round 1 matchups", () => {
    it("should create a game row and a pick row for a standard round 1 matchup", () => {
      const teamA = makeTeam("Duke", "1", { win: true, score: "80" });
      const teamB = makeTeam("FGCU", "16", { win: false, score: "60" });
      const matchup = makeMatchup(teamA, teamB);

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: {
          ...emptyRoundMatchups(),
          east: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "Duke", seed: "1" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["Duke", "FGCU"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      expect(result).toHaveLength(1);

      const { game, pick } = result[0];
      expect(game.year_id).toBe(YEAR_ID);
      expect(game.round_id).toBe("round-1-uuid");
      expect(game.is_play_in).toBe(false);
      expect(game.favored_team_id).toBe("Duke-uuid");
      expect(game.favored_team_seed).toBe(1);
      expect(game.favored_team_score).toBe(80);
      expect(game.underdog_team_id).toBe("FGCU-uuid");
      expect(game.underdog_team_seed).toBe(16);
      expect(game.underdog_team_score).toBe(60);
      expect(game.winning_team_id).toBe("Duke-uuid");

      expect(pick).toBeDefined();
      expect(pick!.bracket_id).toBe(BRACKET_ID);
      expect(pick!.picked_team_id).toBe("Duke-uuid");
      expect(pick!.picked_team_seed).toBe(1);
    });

    it("should determine favored/underdog by lower seed number", () => {
      const teamA = makeTeam("LowSeed", "12", { win: true, score: "70" });
      const teamB = makeTeam("HighSeed", "5", { win: false, score: "65" });
      const matchup = makeMatchup(teamA, teamB);

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: {
          ...emptyRoundMatchups(),
          west: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          west: [[{ team: "LowSeed", seed: "12" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["LowSeed", "HighSeed"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const { game } = result[0];
      expect(game.favored_team_id).toBe("HighSeed-uuid");
      expect(game.favored_team_seed).toBe(5);
      expect(game.underdog_team_id).toBe("LowSeed-uuid");
      expect(game.underdog_team_seed).toBe(12);
      expect(game.winning_team_id).toBe("LowSeed-uuid");
    });

    it("should determine the winner by score when win flag is not set", () => {
      const teamA = makeTeam("TeamA", "3", { score: "72" });
      const teamB = makeTeam("TeamB", "14", { score: "80" });
      const matchup = makeMatchup(teamA, teamB);

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: {
          ...emptyRoundMatchups(),
          south: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          south: [[{ team: "TeamB", seed: "14" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["TeamA", "TeamB"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const { game } = result[0];
      expect(game.winning_team_id).toBe("TeamB-uuid");
    });

    it("should default scores to 0 when not provided", () => {
      const teamA = makeTeam("TeamA", "1", { win: true });
      const teamB = makeTeam("TeamB", "16");
      const matchup = makeMatchup(teamA, teamB);

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: {
          ...emptyRoundMatchups(),
          east: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "TeamA", seed: "1" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["TeamA", "TeamB"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const { game } = result[0];
      expect(game.favored_team_score).toBe(0);
      expect(game.underdog_team_score).toBe(0);
    });

    it("should map multiple matchups in a region with correct pick indices", () => {
      const matchup1 = makeMatchup(
        makeTeam("Seed1", "1", { win: true, score: "80" }),
        makeTeam("Seed16", "16", { score: "50" }),
      );
      const matchup2 = makeMatchup(
        makeTeam("Seed8", "8", { score: "60" }),
        makeTeam("Seed9", "9", { win: true, score: "65" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: {
          ...emptyRoundMatchups(),
          east: [matchup1, matchup2],
        },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [
            [{ team: "Seed1", seed: "1" }],
            [{ team: "Seed9", seed: "9" }],
          ],
        },
      });

      const teamIdMap = makeTeamIdMap(["Seed1", "Seed16", "Seed8", "Seed9"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      expect(result).toHaveLength(2);
      expect(result[0].pick!.picked_team_id).toBe("Seed1-uuid");
      expect(result[1].pick!.picked_team_id).toBe("Seed9-uuid");
    });
  });

  describe("play-in games", () => {
    it("should create game rows without pick rows for eleven seed play-ins", () => {
      const matchup = makeMatchup(
        makeTeam("PlayinA", "11", { win: true, score: "70" }),
        makeTeam("PlayinB", "11", { score: "65" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: {
          ...emptyRoundMatchups(),
          playin: {
            elevenSeeds: [matchup],
            sixteenSeeds: [],
          },
        } as TournamentRoundMatchups,
      });

      const picksState = makeEmptyPicksState();
      const teamIdMap = makeTeamIdMap(["PlayinA", "PlayinB"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      expect(result).toHaveLength(1);
      expect(result[0].game.is_play_in).toBe(true);
      expect(result[0].pick).toBeUndefined();
    });

    it("should create game rows without pick rows for sixteen seed play-ins", () => {
      const matchup = makeMatchup(
        makeTeam("Playin16A", "16", { win: true, score: "55" }),
        makeTeam("Playin16B", "16", { score: "50" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: {
          ...emptyRoundMatchups(),
          playin: {
            elevenSeeds: [],
            sixteenSeeds: [matchup],
          },
        } as TournamentRoundMatchups,
      });

      const picksState = makeEmptyPicksState();
      const teamIdMap = makeTeamIdMap(["Playin16A", "Playin16B"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      expect(result).toHaveLength(1);
      expect(result[0].game.is_play_in).toBe(true);
      expect(result[0].pick).toBeUndefined();
    });

    it("should handle multiple play-in games across both seed groups", () => {
      const elevenSeed1 = makeMatchup(
        makeTeam("E11A", "11", { win: true, score: "70" }),
        makeTeam("E11B", "11", { score: "60" }),
      );
      const elevenSeed2 = makeMatchup(
        makeTeam("E11C", "11", { score: "55" }),
        makeTeam("E11D", "11", { win: true, score: "65" }),
      );
      const sixteenSeed1 = makeMatchup(
        makeTeam("S16A", "16", { win: true, score: "50" }),
        makeTeam("S16B", "16", { score: "45" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: {
          ...emptyRoundMatchups(),
          playin: {
            elevenSeeds: [elevenSeed1, elevenSeed2],
            sixteenSeeds: [sixteenSeed1],
          },
        } as TournamentRoundMatchups,
      });

      const picksState = makeEmptyPicksState();
      const teamIdMap = makeTeamIdMap([
        "E11A",
        "E11B",
        "E11C",
        "E11D",
        "S16A",
        "S16B",
      ]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const playinRows = result.filter((r) => r.game.is_play_in);
      expect(playinRows).toHaveLength(3);
      playinRows.forEach((row) => expect(row.pick).toBeUndefined());
    });
  });

  describe("round 2 matchups", () => {
    it("should create game and pick rows for round 2", () => {
      const matchup = makeMatchup(
        makeTeam("TeamR2A", "1", { win: true, score: "85" }),
        makeTeam("TeamR2B", "8", { score: "70" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundTwoMatchups: {
          ...emptyRoundMatchups(),
          midwest: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundSweetSixteenPicks: {
          ...emptyRegionPicks(),
          midwest: [[{ team: "TeamR2A", seed: "1" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["TeamR2A", "TeamR2B"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const round2Rows = result.filter(
        (r) => r.game.round_id === "round-2-uuid",
      );
      expect(round2Rows).toHaveLength(1);
      expect(round2Rows[0].game.favored_team_id).toBe("TeamR2A-uuid");
      expect(round2Rows[0].pick!.picked_team_id).toBe("TeamR2A-uuid");
    });
  });

  describe("sweet sixteen matchups", () => {
    it("should create game and pick rows for sweet sixteen", () => {
      const matchup = makeMatchup(
        makeTeam("S16TeamA", "2", { win: true, score: "75" }),
        makeTeam("S16TeamB", "3", { score: "70" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundSweetSixteenMatchups: {
          ...emptyRoundMatchups(),
          west: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundEliteEightPicks: {
          ...emptyRegionPicks(),
          west: [[{ team: "S16TeamA", seed: "2" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["S16TeamA", "S16TeamB"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const s16Rows = result.filter(
        (r) => r.game.round_id === "round-s16-uuid",
      );
      expect(s16Rows).toHaveLength(1);
      expect(s16Rows[0].game.round_id).toBe("round-s16-uuid");
      expect(s16Rows[0].pick).toBeDefined();
    });
  });

  describe("elite eight matchups", () => {
    it("should use regionBasedPickIndex for east region mapping to eastWest", () => {
      const matchup = makeMatchup(
        makeTeam("E8EastA", "1", { win: true, score: "80" }),
        makeTeam("E8EastB", "4", { score: "70" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundEliteEightMatchups: {
          ...emptyRoundMatchups(),
          east: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundFinalFourPicks: {
          eastWest: [
            [{ team: "WestPick", seed: "2" }],
            [{ team: "E8EastA", seed: "1" }],
          ],
        },
      });

      const teamIdMap = makeTeamIdMap(["E8EastA", "E8EastB", "WestPick"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const e8Rows = result.filter((r) => r.game.round_id === "round-e8-uuid");
      expect(e8Rows).toHaveLength(1);
      expect(e8Rows[0].pick!.picked_team_id).toBe("E8EastA-uuid");
    });

    it("should use regionBasedPickIndex for west region mapping to eastWest", () => {
      const matchup = makeMatchup(
        makeTeam("E8WestA", "1", { win: true, score: "80" }),
        makeTeam("E8WestB", "5", { score: "70" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundEliteEightMatchups: {
          ...emptyRoundMatchups(),
          west: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundFinalFourPicks: {
          eastWest: [
            [{ team: "E8WestA", seed: "1" }],
            [{ team: "EastPick", seed: "2" }],
          ],
        },
      });

      const teamIdMap = makeTeamIdMap(["E8WestA", "E8WestB", "EastPick"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const e8Rows = result.filter((r) => r.game.round_id === "round-e8-uuid");
      expect(e8Rows).toHaveLength(1);
      expect(e8Rows[0].pick!.picked_team_id).toBe("E8WestA-uuid");
    });

    it("should use regionBasedPickIndex for south region mapping to southMidwest", () => {
      const matchup = makeMatchup(
        makeTeam("E8SouthA", "1", { win: true, score: "90" }),
        makeTeam("E8SouthB", "3", { score: "75" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundEliteEightMatchups: {
          ...emptyRoundMatchups(),
          south: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundFinalFourPicks: {
          southMidwest: [
            [{ team: "E8SouthA", seed: "1" }],
            [{ team: "MidwestPick", seed: "2" }],
          ],
        },
      });

      const teamIdMap = makeTeamIdMap(["E8SouthA", "E8SouthB", "MidwestPick"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const e8Rows = result.filter((r) => r.game.round_id === "round-e8-uuid");
      expect(e8Rows).toHaveLength(1);
      expect(e8Rows[0].pick!.picked_team_id).toBe("E8SouthA-uuid");
    });
  });

  describe("final four matchups", () => {
    it("should map eastWest to championship with pickIndex 0", () => {
      const matchup = makeMatchup(
        makeTeam("FF_EW_A", "1", { win: true, score: "75" }),
        makeTeam("FF_EW_B", "2", { score: "70" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundFinalFourMatchups: {
          eastWest: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundFinalsPicks: {
          championship: [
            [{ team: "FF_EW_A", seed: "1" }],
            [{ team: "FF_SM_Pick", seed: "3" }],
          ],
        },
      });

      const teamIdMap = makeTeamIdMap(["FF_EW_A", "FF_EW_B", "FF_SM_Pick"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const f4Rows = result.filter((r) => r.game.round_id === "round-f4-uuid");
      expect(f4Rows).toHaveLength(1);
      expect(f4Rows[0].pick!.picked_team_id).toBe("FF_EW_A-uuid");
    });

    it("should map southMidwest to championship with pickIndex 1", () => {
      const matchup = makeMatchup(
        makeTeam("FF_SM_A", "1", { win: true, score: "80" }),
        makeTeam("FF_SM_B", "3", { score: "65" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundFinalFourMatchups: {
          southMidwest: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundFinalsPicks: {
          championship: [
            [{ team: "FF_EW_Pick", seed: "2" }],
            [{ team: "FF_SM_A", seed: "1" }],
          ],
        },
      });

      const teamIdMap = makeTeamIdMap(["FF_SM_A", "FF_SM_B", "FF_EW_Pick"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const f4Rows = result.filter((r) => r.game.round_id === "round-f4-uuid");
      expect(f4Rows).toHaveLength(1);
      expect(f4Rows[0].pick!.picked_team_id).toBe("FF_SM_A-uuid");
    });
  });

  describe("finals matchups", () => {
    it("should map the finals to champion with pickIndex 0", () => {
      const matchup = makeMatchup(
        makeTeam("Finalist1", "1", { win: true, score: "85" }),
        makeTeam("Finalist2", "2", { score: "78" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundFinalsMatchups: {
          championship: [matchup],
        },
      });

      const picksState = makeEmptyPicksState({
        champion: {
          champion: [[{ team: "Finalist1", seed: "1" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["Finalist1", "Finalist2"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      const finalsRows = result.filter(
        (r) => r.game.round_id === "round-finals-uuid",
      );
      expect(finalsRows).toHaveLength(1);
      expect(finalsRows[0].pick!.picked_team_id).toBe("Finalist1-uuid");
    });
  });

  describe("winner determination logic", () => {
    it("should pick favored team as winner when favored.win is true", () => {
      const matchup = makeMatchup(
        makeTeam("Favored", "1", { win: true, score: "80" }),
        makeTeam("Underdog", "16", { score: "60" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: { ...emptyRoundMatchups(), east: [matchup] },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "Favored", seed: "1" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["Favored", "Underdog"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      expect(result[0].game.winning_team_id).toBe("Favored-uuid");
    });

    it("should pick underdog as winner when favored has no win flag and lower score", () => {
      const matchup = makeMatchup(
        makeTeam("Favored", "2", { score: "60" }),
        makeTeam("Underdog", "15", { score: "70" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: { ...emptyRoundMatchups(), east: [matchup] },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "Underdog", seed: "15" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["Favored", "Underdog"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      expect(result[0].game.winning_team_id).toBe("Underdog-uuid");
    });

    it("should pick favored as winner when favored score is higher and no win flag", () => {
      const matchup = makeMatchup(
        makeTeam("Higher", "3", { score: "90" }),
        makeTeam("Lower", "14", { score: "60" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: { ...emptyRoundMatchups(), south: [matchup] },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          south: [[{ team: "Higher", seed: "3" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["Higher", "Lower"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      expect(result[0].game.winning_team_id).toBe("Higher-uuid");
    });

    it("should fall back to underdog when favored has no win and no score", () => {
      const matchup = makeMatchup(makeTeam("Fav", "1"), makeTeam("Dog", "16"));

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: { ...emptyRoundMatchups(), east: [matchup] },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "Dog", seed: "16" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["Fav", "Dog"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      expect(result[0].game.winning_team_id).toBe("Dog-uuid");
    });
  });

  describe("error handling", () => {
    it("should throw when a matchup does not contain exactly 2 teams", () => {
      const badMatchup = [makeTeam("OnlyOne", "1", { win: true })];

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: {
          ...emptyRoundMatchups(),
          east: [badMatchup],
        },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "OnlyOne", seed: "1" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["OnlyOne"]);

      expect(() =>
        mapTournamentToRows({
          bracketId: BRACKET_ID,
          tournamentState,
          picksState,
          teamIdMap,
          roundIdMap: ROUND_IDS,
        }),
      ).toThrow();
    });

    it("should throw when a team is not found in teamIdMap", () => {
      const matchup = makeMatchup(
        makeTeam("Known", "1", { win: true, score: "80" }),
        makeTeam("Unknown", "16", { score: "60" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: { ...emptyRoundMatchups(), east: [matchup] },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "Known", seed: "1" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["Known"]); // "Unknown" missing

      expect(() =>
        mapTournamentToRows({
          bracketId: BRACKET_ID,
          tournamentState,
          picksState,
          teamIdMap,
          roundIdMap: ROUND_IDS,
        }),
      ).toThrow("Team ID not found");
    });

    it("should throw when a round is not found in roundIdMap", () => {
      const matchup = makeMatchup(
        makeTeam("A", "1", { win: true, score: "80" }),
        makeTeam("B", "16", { score: "60" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: { ...emptyRoundMatchups(), east: [matchup] },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "A", seed: "1" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["A", "B"]);
      const emptyRoundIdMap = new Map<TournamentRound, string>();

      expect(() =>
        mapTournamentToRows({
          bracketId: BRACKET_ID,
          tournamentState,
          picksState,
          teamIdMap,
          roundIdMap: emptyRoundIdMap,
        }),
      ).toThrow("Round ID not found");
    });

    it("should throw when a matchup has a team with no name", () => {
      const matchup = makeMatchup(
        makeTeam("", "1", { win: true }),
        makeTeam("TeamB", "16"),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: { ...emptyRoundMatchups(), east: [matchup] },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "TeamB", seed: "16" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["TeamB"]);

      expect(() =>
        mapTournamentToRows({
          bracketId: BRACKET_ID,
          tournamentState,
          picksState,
          teamIdMap,
          roundIdMap: ROUND_IDS,
        }),
      ).toThrow("Invalid matchup");
    });

    it("should throw when picks are not found for a region", () => {
      const matchup = makeMatchup(
        makeTeam("X", "1", { win: true, score: "80" }),
        makeTeam("Y", "16", { score: "60" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: { ...emptyRoundMatchups(), east: [matchup] },
      });

      // No picks for east region
      const picksState = makeEmptyPicksState({
        roundTwoPicks: { west: [], south: [], midwest: [] },
      });

      const teamIdMap = makeTeamIdMap(["X", "Y"]);

      expect(() =>
        mapTournamentToRows({
          bracketId: BRACKET_ID,
          tournamentState,
          picksState,
          teamIdMap,
          roundIdMap: ROUND_IDS,
        }),
      ).toThrow("Picks not found for region");
    });

    it("should throw when a pick team is not in teamIdMap", () => {
      const matchup = makeMatchup(
        makeTeam("TeamA", "1", { win: true, score: "80" }),
        makeTeam("TeamB", "16", { score: "60" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: { ...emptyRoundMatchups(), east: [matchup] },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "GhostTeam", seed: "1" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["TeamA", "TeamB"]); // "GhostTeam" missing

      expect(() =>
        mapTournamentToRows({
          bracketId: BRACKET_ID,
          tournamentState,
          picksState,
          teamIdMap,
          roundIdMap: ROUND_IDS,
        }),
      ).toThrow("Team ID not found for pick team");
    });
  });

  describe("full tournament integration", () => {
    it("should process multiple rounds and produce the correct total number of rows", () => {
      const r1East = makeMatchup(
        makeTeam("R1E1", "1", { win: true, score: "80" }),
        makeTeam("R1E16", "16", { score: "55" }),
      );
      const r2East = makeMatchup(
        makeTeam("R2E1", "1", { win: true, score: "75" }),
        makeTeam("R2E8", "8", { score: "65" }),
      );

      const tournamentState = makeEmptyTournamentState({
        roundOneMatchups: { ...emptyRoundMatchups(), east: [r1East] },
        roundTwoMatchups: { ...emptyRoundMatchups(), east: [r2East] },
      });

      const picksState = makeEmptyPicksState({
        roundTwoPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "R1E1", seed: "1" }]],
        },
        roundSweetSixteenPicks: {
          ...emptyRegionPicks(),
          east: [[{ team: "R2E1", seed: "1" }]],
        },
      });

      const teamIdMap = makeTeamIdMap(["R1E1", "R1E16", "R2E1", "R2E8"]);

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap,
        roundIdMap: ROUND_IDS,
      });

      expect(result).toHaveLength(2);
      expect(result[0].game.round_id).toBe("round-1-uuid");
      expect(result[1].game.round_id).toBe("round-2-uuid");
    });

    it("should return an empty array when all rounds have empty matchups", () => {
      const tournamentState = makeEmptyTournamentState();
      const picksState = makeEmptyPicksState();

      const result = mapTournamentToRows({
        bracketId: BRACKET_ID,
        tournamentState,
        picksState,
        teamIdMap: new Map(),
        roundIdMap: ROUND_IDS,
      });

      expect(result).toEqual([]);
    });
  });
});
