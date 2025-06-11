import { TournamentRound, TournamentRegion } from "@/types";

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
  round: TournamentRound;
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
