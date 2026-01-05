import { supabase } from "@/infrastructure/db/supabaseClient";
import {
  BracketSupabase,
  GameSupabase,
  PickSupabase,
  YearSupabase,
} from "@/models/appStatsData";
import { MappedRowsResult } from "@/application/mappers/mapTournamentToRows";
import { BracketScoringRuleSupabase } from "@/models/appStatsData/BracketScoringRuleSupabase";

interface PersistTournamentData {
  bracket: BracketSupabase;
  gamesAndPicks: MappedRowsResult;
}

export class TournamentRepository {
  async getYears(): Promise<YearSupabase[]> {
    const { data: yearsData, error: yearsError } = await supabase
      .from("years")
      .select("id, year");

    if (yearsError) {
      throw new Error(`Failed to fetch years: ${yearsError.message}`);
    }

    return yearsData;
  }

  async getYearById(yearId: string): Promise<YearSupabase> {
    const { data: yearData, error: yearError } = await supabase
      .from("years")
      .select("*")
      .eq("id", yearId)
      .single();

    if (yearError) {
      throw new Error(`Failed to fetch year: ${yearError.message}`);
    }

    if (!yearData) {
      throw new Error(`No year found for id: ${yearId}`);
    }

    return yearData as YearSupabase;
  }

  async getBracketScoringRulesByYearId(
    yearId: string
  ): Promise<BracketScoringRuleSupabase> {
    const { data: bracketScoringRulesData, error: bracketScoringRulesError } =
      await supabase
        .from("tournament_scoring_rules")
        .select("*")
        .eq("year_id", yearId)
        .single();

    if (bracketScoringRulesError) {
      throw new Error(
        `Failed to fetch bracket scoring rules: ${bracketScoringRulesError.message}`
      );
    }

    if (!bracketScoringRulesData) {
      throw new Error(`No bracket scoring rules found for year_id: ${yearId}`);
    }

    return bracketScoringRulesData as BracketScoringRuleSupabase;
  }

  async persistBracket(bracket: BracketSupabase): Promise<string> {
    const { data: bracketData, error: bracketError } = await supabase
      .from("brackets")
      .insert(bracket)
      .select("id")
      .single();

    if (bracketError || !bracketData) {
      throw new Error(`Failed to create bracket: ${bracketError?.message}`);
    }

    return bracketData.id;
  }

  async persistTournament({
    bracket,
    gamesAndPicks,
  }: PersistTournamentData): Promise<void> {
    if (!bracket.id) {
      throw new Error(
        "Bracket must have an ID before persisting games and picks"
      );
    }

    const persistGame = async (game: GameSupabase) => {
      const { data: gameData, error: gameError } = await supabase
        .from("tournament_games")
        .insert(game)
        .select("id")
        .single();

      if (gameError) {
        throw new Error(`Failed to insert game: ${gameError.message}`);
      }

      return gameData.id;
    };

    const persistPick = async (pick: PickSupabase) => {
      const { error: pickError } = await supabase.from("picks").insert(pick);

      if (pickError) {
        throw new Error(`Failed to insert pick: ${pickError.message}`);
      }
    };

    gamesAndPicks.forEach(async (gameAndPick) => {
      const { game, pick } = gameAndPick;
      const gameId = await persistGame(game);

      const completePick: PickSupabase = {
        ...pick,
        game_id: gameId,
      };
      await persistPick(completePick);
    });
  }
}
