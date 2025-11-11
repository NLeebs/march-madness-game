import { z } from "zod";

export const TeamDefensiveStatsSchema = z.object({
  "cause-turnover-percentage": z.number(),
  "commit-foul-percentage": z.number(),
  "defensive-rebound-percentage": z.number(),
  "opp-three-point-percentage": z.number(),
  "opp-two-point-percentage": z.number(),
});

export type TeamDefensiveStats = z.infer<typeof TeamDefensiveStatsSchema>;
