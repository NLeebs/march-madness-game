import { z } from "zod";

export const YearSupabaseSchema = z.object({
  id: z.string().uuid().optional(),
  year: z.number(),
  created_at: z.string().optional(),
});

export type YearSupabase = z.infer<typeof YearSupabaseSchema>;
