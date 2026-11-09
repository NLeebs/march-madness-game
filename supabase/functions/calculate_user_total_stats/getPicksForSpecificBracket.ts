export type PickDto = {game_id: string, picked_team_id: string;}

export const getPicksForSpecificBracket = async (supabase, bracketId: string) => {
  const { data: picks, error: picksError } = await supabase
    .from("user_picks")
    .select("game_id, picked_team_id")
    .eq("bracket_id", bracketId);

  if (picksError) {
    console.error("Picks error: ", picksError);
    throw new Error(`Picks not found: ${picksError.message} (${picksError.code})`);
  }

  return picks;
}