import { z } from "zod";
import { TeamStatsSchema } from "./TeamStats";

export const TeamMapSchema = z.record(TeamStatsSchema);
export type TeamMap = z.infer<typeof TeamMapSchema>;
