import { z } from "zod";

export const UserScoreSchema = z.object({
  yearPlayed: z.number(),
  gameScore: z.number(),
  finalFourPicked: z.string(),
  championPicked: z.string(),
});
