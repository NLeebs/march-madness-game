import type {
  TournamentRound,
  TournamentRoundMatchups,
  TournamentRegion,
  TournamentTeam,
} from "@/types";

export type ScoredRound = Exclude<TournamentRound, "champion">;

export type MatchupsKey =
  | "roundOneMatchups"
  | "roundTwoMatchups"
  | "roundSweetSixteenMatchups"
  | "roundEliteEightMatchups"
  | "roundFinalFourMatchups"
  | "roundFinalsMatchups";

export type BracketMatchups = { [K in MatchupsKey]: TournamentRoundMatchups } & {
  champion: { [region in TournamentRegion]?: TournamentTeam[][] };
};

export type PlayinSeedType = "elevenSeeds" | "sixteenSeeds";

export type SeedRegion = "west" | "east" | "south" | "midwest";
