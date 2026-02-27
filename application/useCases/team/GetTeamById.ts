import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamSupabase } from "@/models/appStatsData/TeamSupabase";

export async function getTeamById(id: string): Promise<TeamSupabase> {
  const teamRepository = new TeamRepository();
  const team = await teamRepository.getTeamById(id);
  return team;
}
