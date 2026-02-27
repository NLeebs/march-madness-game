import { ConferenceRepository } from "@/infrastructure/db/ConferenceRepository";
import { ConferenceSupabase } from "@/models/appStatsData";

export async function getConferenceById(
  id: string,
): Promise<ConferenceSupabase> {
  const conferenceRepository = new ConferenceRepository();
  const conference = await conferenceRepository.getConferenceById(id);
  return conference;
}
