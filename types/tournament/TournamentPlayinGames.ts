import type { PlayinSeedType } from "./BracketMatchups";

export interface PlayInGameWinner {
  seedType: PlayinSeedType;
  gameIndex: number;
  winningTeam: string;
}
