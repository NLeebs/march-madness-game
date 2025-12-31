import { z } from "zod";

export const BracketSupabaseSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  year_id: z.string().uuid(),
  tournament_scoring_rules_id: z.string().uuid(),
  score: z.number(),
  created_at: z.string().optional(),
});

export type BracketSupabase = z.infer<typeof BracketSupabaseSchema>;
