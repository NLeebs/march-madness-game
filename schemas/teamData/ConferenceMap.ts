import { z } from "zod";
import { TeamMapSchema } from "@/schemas";

const ConferenceMapSchema = z.record(TeamMapSchema);
export type ConferenceMap = z.infer<typeof ConferenceMapSchema>;

export const ConferenceSubmissionSchema = ConferenceMapSchema;
