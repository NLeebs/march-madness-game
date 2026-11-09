export type RoundName = "1" | "2" | "sweet sixteen" | "elite eight" | "final four" | "finals";
export type RoundDto = {id: string; round_name: string;};

export const getAllRounds = async (supabase) => {
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("id, round_name");

  if (roundsError || !rounds) {
    console.error("Rounds error: ", roundsError);
    throw new Error(`Rounds not found: ${roundsError.message} (${roundsError.code})`);
  }

  return rounds;
}