import type { Tables, TablesInsert } from "@/types/database";

export type PickSupabase = Tables<"user_picks">;
// The mapper builds picks before their game exists; persistTournament adds game_id.
export type PickInsertSupabase = Omit<TablesInsert<"user_picks">, "game_id">;
