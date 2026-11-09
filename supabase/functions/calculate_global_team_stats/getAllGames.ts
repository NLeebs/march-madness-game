export type GameDto = {id: string; year_id: string; round_id: string; is_play_in: boolean; favored_team_id: string; favored_team_seed: number; underdog_team_id: string; underdog_team_seed: number; winning_team_id: string;}

export const getAllGames = async (supabase) => {
  const games: GameDto[] = [];
  const pageSize = 1000;
  let gamesFrom = 0;
  while(true) {
    const { data: gamesPage, error: gamesError } = await supabase
      .from("tournament_games")
      .select("id, year_id, round_id, is_play_in, favored_team_id, favored_team_seed, underdog_team_id, underdog_team_seed, winning_team_id")
      .range(gamesFrom, gamesFrom + pageSize - 1);

    if (gamesError) {
      console.error("Games error: ", gamesError);
      throw new Error(`Games not found: ${gamesError.message} (${gamesError.code})`);
    }

    if(!gamesPage || gamesPage.length === 0) break;

    games.push(...gamesPage);
    gamesFrom += pageSize;
  }

  return games;
}