import { ScoredRound, TournamentRegion } from "@/types";

export interface TournamentPlayerPicks {
  picks: TournamentPicks;
}

export type TournamentPicks = {
  [round in TournamentPlayerPickRound]: RegionPicks;
};

export type RegionPicks = {
  [region in TournamentRegion]?: TournamentPickMatchup[];
};

export interface Pick {
  /** The round being picked in; the pick fills that round's next-round slot, so "champion" can't be picked. */
  round: ScoredRound;
  region: string;
  roundIndex: number;
  team: string;
  seed: string;
  opponent: string;
}

export type TournamentPlayerPickRound =
  | "roundTwoPicks"
  | "roundSweetSixteenPicks"
  | "roundEliteEightPicks"
  | "roundFinalFourPicks"
  | "roundFinalsPicks"
  | "champion";

export type TournamentPickMatchup = TournamentPickTeam[];

export type TournamentPickTeam = {
  team: string;
  seed: string;
};
