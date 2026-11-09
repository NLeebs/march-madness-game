export type RoundName = "1" | "finals";
export type RoundDto = {id: string; round_name: RoundName;};

export const getSpecificRounds = async (supabase, roundsToGet: RoundName[]) => {
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("id, round_name")
    .in("round_name", roundsToGet);

  if (roundsError || !rounds) {
    console.error("Rounds error: ", roundsError);
    throw new Error(`Rounds not found: ${roundsError.message} (${roundsError.code})`);
  }

  return rounds;
}