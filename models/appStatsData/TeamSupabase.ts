import { z } from "zod";

export const TeamSupabaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  year_id: z.string().uuid(),
  conference_id: z.string().uuid(),
  team_logo: z.string(),
  created_at: z.string().optional(),
});

export type TeamSupabase = z.infer<typeof TeamSupabaseSchema>;
