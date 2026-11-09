export type BracketDto = {id: string; user_id: string; year_id: string; score: number;}
  
export const getAllBrackets = async (supabase) => {
  const brackets: BracketDto[] = [];
  const pageSize = 1000;
  let bracketsFrom = 0;
  while(true) {
    const { data: bracketsPage, error: bracketError } = await supabase
          .from("user_brackets")
          .select("id, user_id, year_id, score")
          .range(bracketsFrom, bracketsFrom + pageSize - 1);

    if (bracketError) {
      console.error("Brackets error: ", bracketError);
      throw new Error(`Brackets not found: ${bracketError.message} (${bracketError.code})`);
    }

    if(!bracketsPage || bracketsPage.length === 0) break;

    brackets.push(...bracketsPage);
    bracketsFrom += pageSize;
  }

  return brackets;
}