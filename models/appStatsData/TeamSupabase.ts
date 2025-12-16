import { z } from "zod";

export const TeamSupabaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  year_id: z.string().uuid(),
  conference_id: z.string().uuid(),
  created_at: z.string().optional(),
});

export type TeamSupabase = z.infer<typeof TeamSupabaseSchema>;
