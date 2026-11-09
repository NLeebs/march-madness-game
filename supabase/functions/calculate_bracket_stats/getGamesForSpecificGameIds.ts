export type GameDto = {id: string; round_id: string; winning_team_id: string; 
  underdog_team_seed: string;}

export const getGamesForSpecificGameIds = async (supabase, gameIds: string[]) => {
  const games: GameDto[] = [];
  const pageSize = 1000;
  let gamesFrom = 0;
  while(true) {
  const {data: gamesPage, error: gamesError} = await supabase
    .from("tournament_games")
    .select("id, round_id, winning_team_id, underdog_team_seed")
    .in("id", gameIds)
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