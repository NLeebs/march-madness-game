import { z } from "zod";

export const ConferencePerformanceSupabaseSchema = z.object({
  conference_id: z.string().uuid(),
  conference_name: z.string(),
  conference_logo: z.string(),
  wins: z.number().optional(),
  picks: z.number().optional(),
});

export type ConferencePerformanceSupabase = z.infer<
  typeof ConferencePerformanceSupabaseSchema
>;
