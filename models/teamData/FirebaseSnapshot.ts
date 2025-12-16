import { z } from "zod";
import { ConferenceMapSchema } from "./ConferenceMap";

export const FirebaseSnapshotSchema = z.record(ConferenceMapSchema);
export type FirebaseSnapshot = z.infer<typeof FirebaseSnapshotSchema>;
