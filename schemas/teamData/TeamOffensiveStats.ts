import { z } from "zod";

export const TeamOffensiveStatsSchema = z.object({
  "draw-foul-percentage": z.number(),
  "free-throw-percentage": z.number(),
  "offensive-rebound-percentage": z.number(),
  "three-point-percentage": z.number(),
  "two-point-attempt-percentage": z.number(),
  "two-point-percentage": z.number(),
});

export type TeamOffensiveStats = z.infer<typeof TeamOffensiveStatsSchema>;
