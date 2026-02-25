import { z } from "zod";

export const TeamPickCountSupabaseSchema = z.object({
  team_id: z.string().uuid(),
  team_name: z.string(),
  team_logo: z.string(),
  conference_id: z.string().uuid(),
  pick_count: z.number(),
});

export type TeamPickCountSupabase = z.infer<typeof TeamPickCountSupabaseSchema>;
