import { describe, it, expect } from "vitest";
import { mapPicksRegionAndIndex } from "@/application/mappers/mapPicksRegionandIndex";
import { TournamentRegion, TournamentRound } from "@/types";

describe("mapPicksRegionAndIndex", () => {
  describe("elite eight round", () => {
    const roundName: TournamentRound = "elite eight";

    it("should map east region to eastWest with pickIndex 1", () => {
      const result = mapPicksRegionAndIndex(roundName, "east");

      expect(result).toEqual({ picksRegion: "eastWest", pickIndex: 1 });
    });

    it("should map west region to eastWest with pickIndex 0", () => {
      const result = mapPicksRegionAndIndex(roundName, "west");

      expect(result).toEqual({ picksRegion: "eastWest", pickIndex: 0 });
    });

    it("should map south region to southMidwest with pickIndex 0", () => {
      const result = mapPicksRegionAndIndex(roundName, "south");

      expect(result).toEqual({ picksRegion: "southMidwest", pickIndex: 0 });
    });

    it("should map midwest region to southMidwest with pickIndex 1", () => {
      const result = mapPicksRegionAndIndex(roundName, "midwest");

      expect(result).toEqual({ picksRegion: "southMidwest", pickIndex: 1 });
    });

    it("should fall through to default for unhandled elite eight regions", () => {
      const unhandledRegion: TournamentRegion = "championship";
      const result = mapPicksRegionAndIndex(roundName, unhandledRegion);

      expect(result).toEqual({
        picksRegion: unhandledRegion,
        pickIndex: 0,
      });
    });
  });

  describe("final four round", () => {
    const roundName: TournamentRound = "final four";

    it("should map eastWest region to championship with pickIndex 0", () => {
      const result = mapPicksRegionAndIndex(roundName, "eastWest");

      expect(result).toEqual({ picksRegion: "championship", pickIndex: 0 });
    });

    it("should map southMidwest region to championship with pickIndex 1", () => {
      const result = mapPicksRegionAndIndex(roundName, "southMidwest");

      expect(result).toEqual({ picksRegion: "championship", pickIndex: 1 });
    });
  });

  describe("finals round", () => {
    it("should always map to champion with pickIndex 0", () => {
      const result = mapPicksRegionAndIndex("finals", "championship");

      expect(result).toEqual({ picksRegion: "champion", pickIndex: 0 });
    });

    it("should return champion regardless of matchup region", () => {
      const result = mapPicksRegionAndIndex("finals", "east");

      expect(result).toEqual({ picksRegion: "champion", pickIndex: 0 });
    });
  });

  describe("default behavior for earlier rounds", () => {
    it("should return the matchup region as picksRegion with pickIndex 0 for round 1", () => {
      const result = mapPicksRegionAndIndex(1, "east");

      expect(result).toEqual({ picksRegion: "east", pickIndex: 0 });
    });

    it("should return the matchup region as picksRegion with pickIndex 0 for round 2", () => {
      const result = mapPicksRegionAndIndex(2, "west");

      expect(result).toEqual({ picksRegion: "west", pickIndex: 0 });
    });

    it("should return the matchup region as picksRegion with pickIndex 0 for sweet sixteen", () => {
      const result = mapPicksRegionAndIndex("sweet sixteen", "south");

      expect(result).toEqual({ picksRegion: "south", pickIndex: 0 });
    });

    it("should preserve any region passed in for non-special rounds", () => {
      const regions: TournamentRegion[] = [
        "east",
        "west",
        "south",
        "midwest",
      ];

      regions.forEach((region) => {
        const result = mapPicksRegionAndIndex(1, region);

        expect(result).toEqual({ picksRegion: region, pickIndex: 0 });
      });
    });
  });
});
