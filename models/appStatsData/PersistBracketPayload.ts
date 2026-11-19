import type { BracketInsertSupabase } from "./BracketSupabase";
import type { GameInsertSupabase } from "./TournamentGameSupabase";

// The jsonb argument of public.persist_bracket (migration 20261119202448).
// Type aliases, not interfaces, so the payload is assignable to the RPC's Json arg.

export type PersistBracketPick = {
  picked_team_id: string;
  picked_team_seed: number;
};

/** A game row without the ids the RPC assigns; `pick` is null for play-in games. */
export type PersistBracketGame = Omit<
  GameInsertSupabase,
  "year_id" | "bracket_id" | "id" | "created_at"
> & { pick: PersistBracketPick | null };

export type PersistBracketPayload = {
  bracket: Omit<BracketInsertSupabase, "id" | "created_at">;
  games: PersistBracketGame[];
};
