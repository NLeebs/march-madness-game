import { Tournament } from "./tournamentStructure";

export interface TournamentPlayerPicks {
  picks: Tournament;
}

export interface Pick {
  round: string;
  region: string;
  roundIndex: string;
  team: string;
  seed: string;
  opponent: string;
}
