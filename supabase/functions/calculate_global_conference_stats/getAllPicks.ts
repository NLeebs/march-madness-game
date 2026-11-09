export type PickDto = {id: string; picked_team_id: string;};

export const getAllPicks = async (supabase) => {
  const picks: PickDto[] = [];
  const pageSize = 1000;
  let picksFrom = 0;
  while(true) {
    const { data: picksPage, error: picksError } = await supabase
      .from("user_picks")
      .select("id, picked_team_id")
      .range(picksFrom, picksFrom + pageSize - 1);

    if (picksError) {
      console.error("Picks error: ", picksError);
      throw new Error(`Picks not found: ${picksError.message} (${picksError.code})`);
    }

    if(!picksPage || picksPage.length === 0) break;

    picks.push(...picksPage);
    picksFrom += pageSize;
  }

  return picks;
}