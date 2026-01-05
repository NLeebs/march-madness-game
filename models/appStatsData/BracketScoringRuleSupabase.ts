import { z } from "zod";

export const BracketScoringRuleSupabaseSchema = z.object({
  id: z.string().uuid().optional(),
  year_id: z.string().uuid(),
  description: z.string(),
  version: z.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type BracketScoringRuleSupabase = z.infer<
  typeof BracketScoringRuleSupabaseSchema
>;
