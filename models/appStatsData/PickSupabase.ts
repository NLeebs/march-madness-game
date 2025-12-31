import { z } from "zod";

export const PickSupabaseSchema = z.object({
  id: z.string().uuid().optional(),
  bracket_id: z.string().uuid(),
  game_id: z.string().uuid(),
  picked_team_id: z.string().uuid(),
  picked_team_seed: z.number(),
  created_at: z.string().optional(),
});

export type PickSupabase = z.infer<typeof PickSupabaseSchema>;
