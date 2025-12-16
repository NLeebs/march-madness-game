import { z } from "zod";
import { TeamMapSchema } from "./TeamMap";

export const ConferenceMapSchema = z.record(TeamMapSchema);
export type ConferenceMap = z.infer<typeof ConferenceMapSchema>;

export const ConferenceSubmissionSchema = ConferenceMapSchema;
