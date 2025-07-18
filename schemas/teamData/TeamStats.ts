import { z } from "zod";
import { TeamDefensiveStatsSchema } from "./TeamDefensiveStats";
import { TeamOffensiveStatsSchema } from "./TeamOffensiveStats";

export const TeamStatsSchema = z.object({
  name: z.string(),
  logo: z.string(),
  mascot: z.string(),
  possessions: z.string(),
  rpi: z.string(),
  "schedule-strength": z.string(),
  "primary-color": z.string(),
  "secondary-color": z.string(),
  "stats-offensive": TeamOffensiveStatsSchema,
  "stats-defense": TeamDefensiveStatsSchema,
});

export type TeamStats = z.infer<typeof TeamStatsSchema>;
