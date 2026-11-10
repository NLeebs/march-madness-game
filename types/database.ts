
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "conferences": {
                  Row: {
                    "conference": string,"conference_logo": string | null,"created_at": string | null,"id": string,"is_power_conference": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "conference": string,"conference_logo"?: string | null,"created_at"?: string | null,"id"?: string,"is_power_conference"?: boolean | null
                  }
                  Update: {
                    "conference"?: string,"conference_logo"?: string | null,"created_at"?: string | null,"id"?: string,"is_power_conference"?: boolean | null
                  }
                  Relationships: [
                    
                  ]
                },"global_conference_stats": {
                  Row: {
                    "conference_id": string,"created_at": string | null,"id": string,"losses": number,"picks": number,"updated_at": string,"wins": number,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conference_id": string,"created_at"?: string | null,"id"?: string,"losses"?: number,"picks"?: number,"updated_at"?: string,"wins"?: number,"year_id": string
                  }
                  Update: {
                    "conference_id"?: string,"created_at"?: string | null,"id"?: string,"losses"?: number,"picks"?: number,"updated_at"?: string,"wins"?: number,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "global_conference_stats_conference_id_fkey"
      columns: ["conference_id"]
isOneToOne: false
      referencedRelation: "conferences"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "global_conference_stats_year_id_fkey"
      columns: ["year_id"]
isOneToOne: false
      referencedRelation: "years"
      referencedColumns: ["id"]
    }
                  ]
                },"global_team_stats": {
                  Row: {
                    "championships": number,"created_at": string | null,"elite_eights": number,"final_fours": number,"finals": number,"id": string,"picks": number | null,"second_rounds": number,"sweet_sixteens": number,"team_id": string,"times_upset": number,"tournament_appearances": number,"tournament_points_scored": number | null,"updated_at": string,"upsets_caused": number,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "championships"?: number,"created_at"?: string | null,"elite_eights"?: number,"final_fours"?: number,"finals"?: number,"id"?: string,"picks"?: number | null,"second_rounds"?: number,"sweet_sixteens"?: number,"team_id": string,"times_upset"?: number,"tournament_appearances"?: number,"tournament_points_scored"?: number | null,"updated_at"?: string,"upsets_caused"?: number,"year_id": string
                  }
                  Update: {
                    "championships"?: number,"created_at"?: string | null,"elite_eights"?: number,"final_fours"?: number,"finals"?: number,"id"?: string,"picks"?: number | null,"second_rounds"?: number,"sweet_sixteens"?: number,"team_id"?: string,"times_upset"?: number,"tournament_appearances"?: number,"tournament_points_scored"?: number | null,"updated_at"?: string,"upsets_caused"?: number,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "global_team_stats_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "global_team_stats_year_id_fkey"
      columns: ["year_id"]
isOneToOne: false
      referencedRelation: "years"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string | null,"favorite_team_id": string | null,"id": string,"updated_at": string,"username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"favorite_team_id"?: string | null,"id"?: string,"updated_at"?: string,"username"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"favorite_team_id"?: string | null,"id"?: string,"updated_at"?: string,"username"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_favorite_team_id_fkey"
      columns: ["favorite_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"rounds": {
                  Row: {
                    "created_at": string | null,"id": string,"round_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"round_name": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"round_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"seed_matchup_stats": {
                  Row: {
                    "created_at": string | null,"higher_seed": number | null,"higher_seed_wins": number,"id": string,"lower_seed": number | null,"lower_seed_wins": number,"round_id": string,"total_games": number,"updated_at": string,"upset_percentage": number | null,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"higher_seed"?: number | null,"higher_seed_wins"?: number,"id"?: string,"lower_seed"?: number | null,"lower_seed_wins"?: number,"round_id": string,"total_games"?: number,"updated_at"?: string,"upset_percentage"?: number | null,"year_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"higher_seed"?: number | null,"higher_seed_wins"?: number,"id"?: string,"lower_seed"?: number | null,"lower_seed_wins"?: number,"round_id"?: string,"total_games"?: number,"updated_at"?: string,"upset_percentage"?: number | null,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seed_matchup_stats_round_id_fkey"
      columns: ["round_id"]
isOneToOne: false
      referencedRelation: "rounds"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "seed_matchup_stats_year_id_fkey"
      columns: ["year_id"]
isOneToOne: false
      referencedRelation: "years"
      referencedColumns: ["id"]
    }
                  ]
                },"teams": {
                  Row: {
                    "conference_id": string | null,"created_at": string | null,"id": string,"name": string,"team_logo": string | null,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conference_id"?: string | null,"created_at"?: string | null,"id"?: string,"name": string,"team_logo"?: string | null,"year_id": string
                  }
                  Update: {
                    "conference_id"?: string | null,"created_at"?: string | null,"id"?: string,"name"?: string,"team_logo"?: string | null,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teams_conference_id_fkey"
      columns: ["conference_id"]
isOneToOne: false
      referencedRelation: "conferences"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_year_id_fkey"
      columns: ["year_id"]
isOneToOne: false
      referencedRelation: "years"
      referencedColumns: ["id"]
    }
                  ]
                },"tournament_games": {
                  Row: {
                    "created_at": string | null,"favored_team_id": string | null,"favored_team_score": number | null,"favored_team_seed": number | null,"id": string,"is_play_in": boolean | null,"round_id": string,"underdog_team_id": string | null,"underdog_team_score": number | null,"underdog_team_seed": number | null,"winning_team_id": string | null,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"favored_team_id"?: string | null,"favored_team_score"?: number | null,"favored_team_seed"?: number | null,"id"?: string,"is_play_in"?: boolean | null,"round_id": string,"underdog_team_id"?: string | null,"underdog_team_score"?: number | null,"underdog_team_seed"?: number | null,"winning_team_id"?: string | null,"year_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"favored_team_id"?: string | null,"favored_team_score"?: number | null,"favored_team_seed"?: number | null,"id"?: string,"is_play_in"?: boolean | null,"round_id"?: string,"underdog_team_id"?: string | null,"underdog_team_score"?: number | null,"underdog_team_seed"?: number | null,"winning_team_id"?: string | null,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournament_games_favored_team_id_fkey"
      columns: ["favored_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_games_round_id_fkey"
      columns: ["round_id"]
isOneToOne: false
      referencedRelation: "rounds"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_games_underdog_team_id_fkey"
      columns: ["underdog_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_games_winning_team_id_fkey"
      columns: ["winning_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_games_year_id_fkey"
      columns: ["year_id"]
isOneToOne: false
      referencedRelation: "years"
      referencedColumns: ["id"]
    }
                  ]
                },"tournament_round_scoring": {
                  Row: {
                    "created_at": string,"id": string,"round_id": string | null,"score": number | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"round_id"?: string | null,"score"?: number | null,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"round_id"?: string | null,"score"?: number | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournament_round_scoring_round_id_fkey"
      columns: ["round_id"]
isOneToOne: false
      referencedRelation: "rounds"
      referencedColumns: ["id"]
    }
                  ]
                },"tournament_scoring_rules": {
                  Row: {
                    "created_at": string | null,"description": string | null,"id": string,"updated_at": string,"version": string | null,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"description"?: string | null,"id"?: string,"updated_at"?: string,"version"?: string | null,"year_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"description"?: string | null,"id"?: string,"updated_at"?: string,"version"?: string | null,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournament_scoring_rules_year_id_fkey"
      columns: ["year_id"]
isOneToOne: true
      referencedRelation: "years"
      referencedColumns: ["id"]
    }
                  ]
                },"user_bracket_stats": {
                  Row: {
                    "bracket_id": string,"champion_correct": boolean,"champion_picked_team_id": string | null,"correct_picks": number,"created_at": string | null,"first_round_upsets_correct": number,"first_round_upsets_picked": number,"games_played": number,"id": string,"incorrect_picks": number,"updated_at": string,"user_id": string,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bracket_id": string,"champion_correct"?: boolean,"champion_picked_team_id"?: string | null,"correct_picks"?: number,"created_at"?: string | null,"first_round_upsets_correct"?: number,"first_round_upsets_picked"?: number,"games_played"?: number,"id"?: string,"incorrect_picks"?: number,"updated_at"?: string,"user_id": string,"year_id": string
                  }
                  Update: {
                    "bracket_id"?: string,"champion_correct"?: boolean,"champion_picked_team_id"?: string | null,"correct_picks"?: number,"created_at"?: string | null,"first_round_upsets_correct"?: number,"first_round_upsets_picked"?: number,"games_played"?: number,"id"?: string,"incorrect_picks"?: number,"updated_at"?: string,"user_id"?: string,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_bracket_stats_bracket_id_fkey"
      columns: ["bracket_id"]
isOneToOne: false
      referencedRelation: "user_brackets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_bracket_stats_champion_picked_team_id_fkey"
      columns: ["champion_picked_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_bracket_stats_year_id_fkey"
      columns: ["year_id"]
isOneToOne: false
      referencedRelation: "years"
      referencedColumns: ["id"]
    }
                  ]
                },"user_brackets": {
                  Row: {
                    "anon_user_id": string | null,"created_at": string | null,"id": string,"score": number,"tournament_scoring_rules_id": string,"user_id": string | null,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anon_user_id"?: string | null,"created_at"?: string | null,"id"?: string,"score"?: number,"tournament_scoring_rules_id": string,"user_id"?: string | null,"year_id": string
                  }
                  Update: {
                    "anon_user_id"?: string | null,"created_at"?: string | null,"id"?: string,"score"?: number,"tournament_scoring_rules_id"?: string,"user_id"?: string | null,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_brackets_tournament_scoring_rules_id_fkey"
      columns: ["tournament_scoring_rules_id"]
isOneToOne: false
      referencedRelation: "tournament_scoring_rules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_brackets_year_id_fkey"
      columns: ["year_id"]
isOneToOne: false
      referencedRelation: "years"
      referencedColumns: ["id"]
    }
                  ]
                },"user_picks": {
                  Row: {
                    "bracket_id": string,"created_at": string | null,"game_id": string,"id": string,"picked_team_id": string | null,"picked_team_seed": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bracket_id": string,"created_at"?: string | null,"game_id": string,"id"?: string,"picked_team_id"?: string | null,"picked_team_seed"?: number | null
                  }
                  Update: {
                    "bracket_id"?: string,"created_at"?: string | null,"game_id"?: string,"id"?: string,"picked_team_id"?: string | null,"picked_team_seed"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_picks_bracket_id_fkey"
      columns: ["bracket_id"]
isOneToOne: false
      referencedRelation: "user_brackets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_picks_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "tournament_games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_picks_picked_team_id_fkey"
      columns: ["picked_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"user_total_stats": {
                  Row: {
                    "average_score": number,"average_score_rank": number | null,"champion_correct_percentage": number | null,"champions_guessed_correctly": number,"champions_guessed_correctly_rank": number | null,"correct_pick_percentage": number | null,"created_at": string | null,"elite_eight_correct_percentage": number | null,"elite_eights_guessed_correctly": number | null,"final_four_correct_percentage": number | null,"final_fours_guessed_correctly": number | null,"first_round_upsets_correct_percentage": number | null,"high_score": number,"high_score_rank": number | null,"id": string,"last_ten_average_score": number | null,"last_three_average_score": number | null,"low_score": number,"round_one_correct_percentage": number | null,"round_two_correct_percentage": number | null,"round_twos_guessed_correctly": number | null,"rounds_ones_guessed_correctly": number | null,"sweet_sixteen_correct_percentage": number | null,"sweet_sixteens_guessed_correctly": number | null,"top_picked_champion_id": string | null,"top_picked_conference_id": string | null,"total_brackets": number,"total_correct_picks": number | null,"total_elite_eights_picked": number | null,"total_final_fours_picked": number | null,"total_first_round_upsets_correct": number | null,"total_first_round_upsets_picked": number | null,"total_picks": number,"total_round_ones_picked": number | null,"total_round_twos_picked": number | null,"total_sweet_sixteens_picked": number | null,"total_top_picked_champion_picks": number | null,"total_top_picked_conference_picks": number | null,"updated_at": string,"user_id": string,"year_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "average_score": number,"average_score_rank"?: number | null,"champion_correct_percentage"?: number | null,"champions_guessed_correctly": number,"champions_guessed_correctly_rank"?: number | null,"correct_pick_percentage"?: number | null,"created_at"?: string | null,"elite_eight_correct_percentage"?: number | null,"elite_eights_guessed_correctly"?: number | null,"final_four_correct_percentage"?: number | null,"final_fours_guessed_correctly"?: number | null,"first_round_upsets_correct_percentage"?: number | null,"high_score": number,"high_score_rank"?: number | null,"id"?: string,"last_ten_average_score"?: number | null,"last_three_average_score"?: number | null,"low_score": number,"round_one_correct_percentage"?: number | null,"round_two_correct_percentage"?: number | null,"round_twos_guessed_correctly"?: number | null,"rounds_ones_guessed_correctly"?: number | null,"sweet_sixteen_correct_percentage"?: number | null,"sweet_sixteens_guessed_correctly"?: number | null,"top_picked_champion_id"?: string | null,"top_picked_conference_id"?: string | null,"total_brackets": number,"total_correct_picks"?: number | null,"total_elite_eights_picked"?: number | null,"total_final_fours_picked"?: number | null,"total_first_round_upsets_correct"?: number | null,"total_first_round_upsets_picked"?: number | null,"total_picks": number,"total_round_ones_picked"?: number | null,"total_round_twos_picked"?: number | null,"total_sweet_sixteens_picked"?: number | null,"total_top_picked_champion_picks"?: number | null,"total_top_picked_conference_picks"?: number | null,"updated_at"?: string,"user_id": string,"year_id": string
                  }
                  Update: {
                    "average_score"?: number,"average_score_rank"?: number | null,"champion_correct_percentage"?: number | null,"champions_guessed_correctly"?: number,"champions_guessed_correctly_rank"?: number | null,"correct_pick_percentage"?: number | null,"created_at"?: string | null,"elite_eight_correct_percentage"?: number | null,"elite_eights_guessed_correctly"?: number | null,"final_four_correct_percentage"?: number | null,"final_fours_guessed_correctly"?: number | null,"first_round_upsets_correct_percentage"?: number | null,"high_score"?: number,"high_score_rank"?: number | null,"id"?: string,"last_ten_average_score"?: number | null,"last_three_average_score"?: number | null,"low_score"?: number,"round_one_correct_percentage"?: number | null,"round_two_correct_percentage"?: number | null,"round_twos_guessed_correctly"?: number | null,"rounds_ones_guessed_correctly"?: number | null,"sweet_sixteen_correct_percentage"?: number | null,"sweet_sixteens_guessed_correctly"?: number | null,"top_picked_champion_id"?: string | null,"top_picked_conference_id"?: string | null,"total_brackets"?: number,"total_correct_picks"?: number | null,"total_elite_eights_picked"?: number | null,"total_final_fours_picked"?: number | null,"total_first_round_upsets_correct"?: number | null,"total_first_round_upsets_picked"?: number | null,"total_picks"?: number,"total_round_ones_picked"?: number | null,"total_round_twos_picked"?: number | null,"total_sweet_sixteens_picked"?: number | null,"total_top_picked_champion_picks"?: number | null,"total_top_picked_conference_picks"?: number | null,"updated_at"?: string,"user_id"?: string,"year_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_total_stats_top_picked_champion_id_fkey"
      columns: ["top_picked_champion_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_total_stats_top_picked_conference_id_fkey"
      columns: ["top_picked_conference_id"]
isOneToOne: false
      referencedRelation: "conferences"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_total_stats_year_id_fkey"
      columns: ["year_id"]
isOneToOne: false
      referencedRelation: "years"
      referencedColumns: ["id"]
    }
                  ]
                },"years": {
                  Row: {
                    "created_at": string | null,"id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"year": number
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ensure_profile_exists":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"get_most_upset_teams_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"team_id": string,"team_logo": string,"team_name": string,"times_upset": number
            }[]
                           },
"get_seed_matchup_upset_percentages_by_year_and_round":
{ Args: { "p_round_name": string,"p_year_id": string }; Returns: {
              "higher_seed": number,"lower_seed": number,"round_id": string,"upset_percentage": number
            }[]
                           },
"get_teams_that_caused_most_upsets_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"team_id": string,"team_logo": string,"team_name": string,"upsets_caused": number
            }[]
                           },
"get_teams_with_most_championships_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "championships": number,"conference_id": string,"team_id": string,"team_logo": string,"team_name": string
            }[]
                           },
"get_teams_with_most_elite_eight_appearances_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"elite_eights": number,"team_id": string,"team_logo": string,"team_name": string
            }[]
                           },
"get_teams_with_most_final_four_appearances_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"final_fours": number,"team_id": string,"team_logo": string,"team_name": string
            }[]
                           },
"get_teams_with_most_finals_appearances_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"finals": number,"team_id": string,"team_logo": string,"team_name": string
            }[]
                           },
"get_teams_with_most_second_round_appearances_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"second_rounds": number,"team_id": string,"team_logo": string,"team_name": string
            }[]
                           },
"get_teams_with_most_sweet_sixteen_appearances_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"sweet_sixteens": number,"team_id": string,"team_logo": string,"team_name": string
            }[]
                           },
"get_teams_with_most_tournament_appearances_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"team_id": string,"team_logo": string,"team_name": string,"tournament_appearances": number
            }[]
                           },
"get_top_performing_conferences_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"conference_logo": string,"conference_name": string,"wins": number
            }[]
                           },
"get_top_performing_non_power_conference_teams_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"team_id": string,"team_logo": string,"team_name": string,"tournament_points_scored": number
            }[]
                           },
"get_top_performing_non_power_conferences_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"conference_logo": string,"conference_name": string,"wins": number
            }[]
                           },
"get_top_performing_teams_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"team_id": string,"team_logo": string,"team_name": string,"tournament_points_scored": number
            }[]
                           },
"get_top_picked_conferences_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"conference_logo": string,"conference_name": string,"picks": number
            }[]
                           },
"get_top_picked_teams_by_year":
{ Args: { "p_year_id": string }; Returns: {
              "conference_id": string,"picks": number,"team_id": string,"team_logo": string,"team_name": string
            }[]
                           },
"get_top_picked_teams_for_user_and_year":
{ Args: { "p_user_id": string,"p_year_id": string }; Returns: {
              "conference_id": string,"pick_count": number,"team_id": string,"team_logo": string,"team_name": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
