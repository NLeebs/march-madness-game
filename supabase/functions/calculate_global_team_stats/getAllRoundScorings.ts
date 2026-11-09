export type RoundScoringDto = {id: string; round_id: string; score: number;};

export const getAllRoundScorings = async (supabase) => {
  const { data: roundScoring, error: roundScoringError } = await supabase
    .from("tournament_round_scoring")
    .select("id, round_id, score");

  if (roundScoringError || !roundScoring) {
    console.error("Round Scoring error: ", roundScoringError);
    throw new Error(`Round Scorings not found: ${roundScoringError.message} (${roundScoringError.code})`);
  }

  return roundScoring;
}