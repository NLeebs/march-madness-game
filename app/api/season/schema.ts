import { z } from "zod";

export const SeasonRequestSchema = z.object({ yearId: z.string().uuid() }).strict();

export type SeasonRequestBody = z.infer<typeof SeasonRequestSchema>;
