import { z } from "zod";
import { UserScoreSchema } from "./UserScore";

export const UserStatsSchema = z.object({
  averageScore: z.number(),
  scores: z.record(UserScoreSchema),
});
