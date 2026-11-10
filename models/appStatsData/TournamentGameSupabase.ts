import type { Tables, TablesInsert } from "@/types/database";

export type GameSupabase = Tables<"tournament_games">;
export type GameInsertSupabase = TablesInsert<"tournament_games">;
