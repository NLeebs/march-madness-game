import { z } from "zod";

export const ConferenceSupabaseSchema = z.object({
  id: z.string().uuid().optional(),
  conference: z.string(),
  conference_logo: z.string(),
  created_at: z.string().optional(),
});

export type ConferenceSupabase = z.infer<typeof ConferenceSupabaseSchema>;
