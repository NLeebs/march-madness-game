import { z } from "zod";

export const ProfileSupabaseSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  favorite_team_id: z.string().uuid().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type ProfileSupabase = z.infer<typeof ProfileSupabaseSchema>;
