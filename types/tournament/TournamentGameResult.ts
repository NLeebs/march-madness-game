import { TournamentRegion } from "./TournamentRegion";

export interface TournamentGameResult {
  region: TournamentRegion | null;
  gameIndex: number;
  winningTeam: string;
  winningScore: number;
  losingScore: number;
  seed?: string;
}
