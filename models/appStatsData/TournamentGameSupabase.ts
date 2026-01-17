import { z } from "zod";

export const GameSupabaseSchema = z.object({
  id: z.string().uuid().optional(),
  year_id: z.string().uuid(),
  round_id: z.string().uuid(),
  is_play_in: z.boolean(),
  favored_team_id: z.string().uuid(),
  favored_team_seed: z.number(),
  favored_team_score: z.number(),
  underdog_team_id: z.string().uuid(),
  underdog_team_seed: z.number(),
  underdog_team_score: z.number(),
  winning_team_id: z.string().uuid(),
  created_at: z.string().optional(),
});

export type GameSupabase = z.infer<typeof GameSupabaseSchema>;
