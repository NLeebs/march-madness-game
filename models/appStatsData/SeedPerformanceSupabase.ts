import { z } from "zod";

export const SeedPerformanceSupabaseSchema = z.object({
  upset_percentage: z.number(),
  higher_seed: z.number(),
  lower_seed: z.number(),
  round_id: z.string().uuid(),
});

export type SeedPerformanceSupabase = z.infer<
  typeof SeedPerformanceSupabaseSchema
>;
