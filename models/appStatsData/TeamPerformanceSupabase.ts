import { z } from "zod";

export const TeamPerformanceSupabaseSchema = z.object({
  team_id: z.string().uuid(),
  team_name: z.string(),
  team_logo: z.string(),
  conference_id: z.string().uuid(),
  tournament_points_scored: z.number().optional(),
  picks: z.number().optional(),
  times_upset: z.number().optional(),
  upsets_caused: z.number().optional(),
  championships: z.number().optional(),
  finals: z.number().optional(),
  final_fours: z.number().optional(),
  elite_eights: z.number().optional(),
  sweet_sixteens: z.number().optional(),
  second_rounds: z.number().optional(),
  tournament_appearances: z.number().optional(),
});

export type TeamPerformanceSupabase = z.infer<
  typeof TeamPerformanceSupabaseSchema
>;
