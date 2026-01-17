import { z } from "zod";

export const RoundSupabaseSchema = z.object({
  id: z.string().uuid().optional(),
  round_name: z.string(),
  created_at: z.string().optional(),
});

export type RoundSupabase = z.infer<typeof RoundSupabaseSchema>;
