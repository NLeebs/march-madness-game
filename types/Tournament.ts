import { TournamentMatchup, TournamentPlayerPickRound } from "@/types";

export type Tournament = {
  [round in TournamentPlayerPickRound]: TournamentMatchup[];
};
