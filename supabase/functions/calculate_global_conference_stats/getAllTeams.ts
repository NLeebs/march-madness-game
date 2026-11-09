export type TeamDto = {id: string; year_id: string; conference_id: string};

export const getAllTeams = async (supabase) => {
  const teams: TeamDto[] = [];
  const pageSize = 1000;
  let teamsFrom = 0;
  while(true) {
    const { data: teamsPage, error: teamsError } = await supabase
      .from("teams")
      .select("id, year_id, conference_id")
      .range(teamsFrom, teamsFrom + pageSize - 1);

    if (teamsError) {
      console.error("Teams error: ", teamsError);
      throw new Error(`Teams not found: ${teamsError.message} (${teamsError.code})`);
    }

    if(!teamsPage || teamsPage.length === 0) break;

    teams.push(...teamsPage);
    teamsFrom += pageSize;
  }

  return teams;
}