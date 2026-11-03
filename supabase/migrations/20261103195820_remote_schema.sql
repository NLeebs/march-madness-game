


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."debug_auth_context"() RETURNS json
    LANGUAGE "sql"
    AS $$
select json_build_object(
  'jwt_role', current_setting('request.jwt.claim.role', true),
  'jwt_sub', current_setting('request.jwt.claim.sub', true),
  'auth_uid', auth.uid(),
  'auth_role', auth.role()
);
$$;


ALTER FUNCTION "public"."debug_auth_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_profile_exists"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insert a minimal profile row for the current user id if it doesn't exist.
  INSERT INTO public.profiles (id)
  VALUES ((SELECT auth.uid())::uuid)
  ON CONFLICT (id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."ensure_profile_exists"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_most_upset_teams_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "times_upset" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.times_upset
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by times_upset desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_most_upset_teams_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_seed_matchup_upset_percentages_by_year_and_round"("p_year_id" "uuid", "p_round_name" "text") RETURNS TABLE("upset_percentage" numeric, "higher_seed" numeric, "lower_seed" numeric, "round_id" "uuid")
    LANGUAGE "sql" STABLE
    AS $$select
    sm.upset_percentage,
    sm.higher_seed,
    sm.lower_seed,
    r.id as round_id
  from seed_matchup_stats sm
  join rounds r
    on sm.round_id = r.id
  where sm.year_id = p_year_id
    and r.round_name = p_round_name
  order by upset_percentage desc
  limit 8;$$;


ALTER FUNCTION "public"."get_seed_matchup_upset_percentages_by_year_and_round"("p_year_id" "uuid", "p_round_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teams_that_caused_most_upsets_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "upsets_caused" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.upsets_caused
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by upsets_caused desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_teams_that_caused_most_upsets_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teams_with_most_championships_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "championships" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.championships
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by championships desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_teams_with_most_championships_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teams_with_most_elite_eight_appearances_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "elite_eights" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.elite_eights
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by elite_eights desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_teams_with_most_elite_eight_appearances_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teams_with_most_final_four_appearances_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "final_fours" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.final_fours
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by final_fours desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_teams_with_most_final_four_appearances_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teams_with_most_finals_appearances_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "finals" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.finals
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by finals desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_teams_with_most_finals_appearances_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teams_with_most_second_round_appearances_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "second_rounds" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.second_rounds
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by second_rounds desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_teams_with_most_second_round_appearances_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teams_with_most_sweet_sixteen_appearances_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "sweet_sixteens" bigint)
    LANGUAGE "sql" STABLE
    AS $$select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.sweet_sixteens
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by sweet_sixteens desc
  limit 5;$$;


ALTER FUNCTION "public"."get_teams_with_most_sweet_sixteen_appearances_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teams_with_most_tournament_appearances_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "tournament_appearances" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.tournament_appearances
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by tournament_appearances desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_teams_with_most_tournament_appearances_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_performing_conferences_by_year"("p_year_id" "uuid") RETURNS TABLE("conference_id" "uuid", "conference_name" "text", "conference_logo" "text", "wins" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    c.id as conference_id,
    c.conference as conference_name,
    c.conference_logo,
    gs.wins
  from global_conference_stats gs
  join conferences c
    on gs.conference_id = c.id
  where gs.year_id = p_year_id
  order by wins desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_top_performing_conferences_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_performing_non_power_conference_teams_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "tournament_points_scored" bigint)
    LANGUAGE "sql" STABLE
    AS $$select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.tournament_points_scored
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  join conferences c
    on t.conference_id = c.id
  where gs.year_id = p_year_id
    and c.is_power_conference = false
  order by tournament_points_scored desc
  limit 5;$$;


ALTER FUNCTION "public"."get_top_performing_non_power_conference_teams_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_performing_non_power_conferences_by_year"("p_year_id" "uuid") RETURNS TABLE("conference_id" "uuid", "conference_name" "text", "conference_logo" "text", "wins" bigint)
    LANGUAGE "sql" STABLE
    AS $$select
    c.id as conference_id,
    c.conference as conference_name,
    c.conference_logo,
    gs.wins
  from global_conference_stats gs
  join conferences c
    on gs.conference_id = c.id
  where gs.year_id = p_year_id
    and c.is_power_conference = false
  order by wins desc
  limit 5;$$;


ALTER FUNCTION "public"."get_top_performing_non_power_conferences_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_performing_teams_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "tournament_points_scored" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.tournament_points_scored
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by tournament_points_scored desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_top_performing_teams_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_picked_conferences_by_year"("p_year_id" "uuid") RETURNS TABLE("conference_id" "uuid", "conference_name" "text", "conference_logo" "text", "picks" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    c.id as conference_id,
    c.conference as conference_name,
    c.conference_logo,
    gs.picks
  from global_conference_stats gs
  join conferences c
    on gs.conference_id = c.id
  where gs.year_id = p_year_id
    and c.is_power_conference = false
  order by picks desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_top_picked_conferences_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_picked_teams_by_year"("p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "picks" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    t.id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    gs.picks
  from global_team_stats gs
  join teams t
    on gs.team_id = t.id
  where gs.year_id = p_year_id
  order by picks desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_top_picked_teams_by_year"("p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_picked_teams_for_user_and_year"("p_user_id" "uuid", "p_year_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_logo" "text", "conference_id" "uuid", "pick_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    p.picked_team_id as team_id,
    t.name as team_name,
    t.team_logo,
    t.conference_id,
    count(*) as pick_count
  from user_picks p
  join user_brackets b
    on p.bracket_id = b.id
  join teams t
    on p.picked_team_id = t.id
  where b.user_id = p_user_id
    and b.year_id = p_year_id
  group by 
    p.picked_team_id,
    t.name,
    t.team_logo,
    t.conference_id
  order by pick_count desc
  limit 5;
$$;


ALTER FUNCTION "public"."get_top_picked_teams_for_user_and_year"("p_user_id" "uuid", "p_year_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  NEW."updated_at" := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."conferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conference" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "conference_logo" "text",
    "is_power_conference" boolean
);


ALTER TABLE "public"."conferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_conference_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year_id" "uuid" NOT NULL,
    "conference_id" "uuid" NOT NULL,
    "picks" integer DEFAULT 0 NOT NULL,
    "wins" integer DEFAULT 0 NOT NULL,
    "losses" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."global_conference_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_team_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "tournament_points_scored" integer,
    "championships" integer DEFAULT 0 NOT NULL,
    "finals" integer DEFAULT 0 NOT NULL,
    "final_fours" integer DEFAULT 0 NOT NULL,
    "elite_eights" integer DEFAULT 0 NOT NULL,
    "sweet_sixteens" integer DEFAULT 0 NOT NULL,
    "second_rounds" integer DEFAULT 0 NOT NULL,
    "tournament_appearances" integer DEFAULT 0 NOT NULL,
    "upsets_caused" integer DEFAULT 0 NOT NULL,
    "times_upset" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "picks" integer
);


ALTER TABLE "public"."global_team_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "username" character varying,
    "favorite_team_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rounds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "round_name" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rounds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seed_matchup_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year_id" "uuid" NOT NULL,
    "round_id" "uuid" NOT NULL,
    "lower_seed" integer,
    "lower_seed_wins" integer DEFAULT 0 NOT NULL,
    "higher_seed" integer,
    "higher_seed_wins" integer DEFAULT 0 NOT NULL,
    "total_games" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "upset_percentage" numeric
);


ALTER TABLE "public"."seed_matchup_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "year_id" "uuid" NOT NULL,
    "conference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_logo" "text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year_id" "uuid" NOT NULL,
    "round_id" "uuid" NOT NULL,
    "is_play_in" boolean DEFAULT false,
    "favored_team_id" "uuid",
    "favored_team_seed" integer,
    "favored_team_score" integer,
    "underdog_team_id" "uuid",
    "underdog_team_seed" integer,
    "underdog_team_score" integer,
    "winning_team_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_round_scoring" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "round_id" "uuid" DEFAULT "gen_random_uuid"(),
    "score" integer,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."tournament_round_scoring" OWNER TO "postgres";


COMMENT ON TABLE "public"."tournament_round_scoring" IS 'Amount of points awarded to correct pick for each round.';



CREATE TABLE IF NOT EXISTS "public"."tournament_scoring_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year_id" "uuid" NOT NULL,
    "description" "text",
    "version" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tournament_scoring_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_bracket_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bracket_id" "uuid" NOT NULL,
    "year_id" "uuid" NOT NULL,
    "games_played" integer DEFAULT 0 NOT NULL,
    "correct_picks" integer DEFAULT 0 NOT NULL,
    "incorrect_picks" integer DEFAULT 0 NOT NULL,
    "first_round_upsets_picked" integer DEFAULT 0 NOT NULL,
    "first_round_upsets_correct" integer DEFAULT 0 NOT NULL,
    "champion_picked_team_id" "uuid",
    "champion_correct" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_bracket_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_brackets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "year_id" "uuid" NOT NULL,
    "tournament_scoring_rules_id" "uuid" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "anon_user_id" "uuid",
    CONSTRAINT "user_brackets_exactly_one_owner" CHECK (((("user_id" IS NOT NULL) AND ("anon_user_id" IS NULL)) OR (("user_id" IS NULL) AND ("anon_user_id" IS NOT NULL))))
);


ALTER TABLE "public"."user_brackets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_picks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bracket_id" "uuid" NOT NULL,
    "game_id" "uuid" NOT NULL,
    "picked_team_id" "uuid",
    "picked_team_seed" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_picks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_total_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year_id" "uuid" NOT NULL,
    "total_brackets" numeric NOT NULL,
    "total_picks" numeric NOT NULL,
    "high_score_rank" numeric,
    "high_score" numeric NOT NULL,
    "low_score" numeric NOT NULL,
    "average_score" numeric NOT NULL,
    "average_score_rank" numeric,
    "champions_guessed_correctly" numeric NOT NULL,
    "champions_guessed_correctly_rank" numeric,
    "top_picked_champion_id" "uuid",
    "top_picked_conference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_correct_picks" numeric,
    "correct_pick_percentage" numeric,
    "total_first_round_upsets_picked" numeric,
    "total_first_round_upsets_correct" numeric,
    "first_round_upsets_correct_percentage" numeric,
    "champion_correct_percentage" numeric,
    "last_three_average_score" numeric,
    "last_ten_average_score" numeric,
    "final_fours_guessed_correctly" numeric,
    "final_four_correct_percentage" numeric,
    "elite_eights_guessed_correctly" numeric,
    "elite_eight_correct_percentage" numeric,
    "sweet_sixteens_guessed_correctly" numeric,
    "sweet_sixteen_correct_percentage" numeric,
    "total_round_twos_picked" numeric,
    "round_twos_guessed_correctly" numeric,
    "round_two_correct_percentage" numeric,
    "total_round_ones_picked" numeric,
    "rounds_ones_guessed_correctly" numeric,
    "round_one_correct_percentage" numeric,
    "total_final_fours_picked" numeric,
    "total_elite_eights_picked" numeric,
    "total_sweet_sixteens_picked" numeric,
    "total_top_picked_champion_picks" numeric,
    "total_top_picked_conference_picks" numeric
);


ALTER TABLE "public"."user_total_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."years" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."years" OWNER TO "postgres";


ALTER TABLE ONLY "public"."conferences"
    ADD CONSTRAINT "conferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_conference_stats"
    ADD CONSTRAINT "global_conference_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_conference_stats"
    ADD CONSTRAINT "global_conference_stats_year_conference_unique" UNIQUE ("year_id", "conference_id");



ALTER TABLE ONLY "public"."global_team_stats"
    ADD CONSTRAINT "global_team_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_team_stats"
    ADD CONSTRAINT "global_team_stats_year_team_unique" UNIQUE ("year_id", "team_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seed_matchup_stats"
    ADD CONSTRAINT "seed_matchup_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seed_matchup_stats"
    ADD CONSTRAINT "seed_matchup_stats_year_round_seeds_unique" UNIQUE ("year_id", "round_id", "higher_seed", "lower_seed");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_games"
    ADD CONSTRAINT "tournament_games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_round_scoring"
    ADD CONSTRAINT "tournament_round_scoring_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_scoring_rules"
    ADD CONSTRAINT "tournament_scoring_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_scoring_rules"
    ADD CONSTRAINT "tournament_scoring_rules_year_unique" UNIQUE ("year_id");



ALTER TABLE ONLY "public"."user_bracket_stats"
    ADD CONSTRAINT "user_bracket_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_brackets"
    ADD CONSTRAINT "user_brackets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_picks"
    ADD CONSTRAINT "user_picks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_total_stats"
    ADD CONSTRAINT "user_total_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_total_stats"
    ADD CONSTRAINT "user_total_stats_user_year_unique" UNIQUE ("user_id", "year_id");



ALTER TABLE ONLY "public"."years"
    ADD CONSTRAINT "years_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."years"
    ADD CONSTRAINT "years_year_key" UNIQUE ("year");



CREATE INDEX "global_conference_stats_year_id_conference_id_idx" ON "public"."global_conference_stats" USING "btree" ("year_id", "conference_id");



CREATE INDEX "global_team_stats_year_id_team_id_idx" ON "public"."global_team_stats" USING "btree" ("year_id", "team_id");



CREATE INDEX "global_team_stats_year_id_tournament_points_scored_idx" ON "public"."global_team_stats" USING "btree" ("year_id", "tournament_points_scored" DESC);



CREATE INDEX "profiles_username_idx" ON "public"."profiles" USING "btree" ("username");



CREATE UNIQUE INDEX "seed_matchup_stats_year_id_round_id_higher_seed_lower_seed_idx" ON "public"."seed_matchup_stats" USING "btree" ("year_id", "round_id", "higher_seed", "lower_seed");



CREATE INDEX "seed_matchup_stats_year_id_round_id_idx" ON "public"."seed_matchup_stats" USING "btree" ("year_id", "round_id");



CREATE UNIQUE INDEX "teams_name_conference_id_year_id_unique" ON "public"."teams" USING "btree" ("name", "conference_id", "year_id");



CREATE INDEX "teams_year_id_idx" ON "public"."teams" USING "btree" ("year_id");



CREATE INDEX "tournament_games_favored_team_id_idx" ON "public"."tournament_games" USING "btree" ("favored_team_id");



CREATE INDEX "tournament_games_round_id_idx" ON "public"."tournament_games" USING "btree" ("round_id");



CREATE INDEX "tournament_games_underdog_team_id_idx" ON "public"."tournament_games" USING "btree" ("underdog_team_id");



CREATE INDEX "tournament_games_winning_team_id_idx" ON "public"."tournament_games" USING "btree" ("winning_team_id");



CREATE INDEX "tournament_games_year_id_round_id_idx" ON "public"."tournament_games" USING "btree" ("year_id", "round_id");



CREATE UNIQUE INDEX "user_bracket_stats_bracket_id_idx" ON "public"."user_bracket_stats" USING "btree" ("bracket_id");



CREATE INDEX "user_bracket_stats_user_id_year_id_idx" ON "public"."user_bracket_stats" USING "btree" ("user_id", "year_id");



CREATE INDEX "user_bracket_stats_year_id_idx" ON "public"."user_bracket_stats" USING "btree" ("year_id");



CREATE INDEX "user_brackets_anon_user_id_idx" ON "public"."user_brackets" USING "btree" ("anon_user_id");



CREATE INDEX "user_brackets_user_id_year_id_idx" ON "public"."user_brackets" USING "btree" ("user_id", "year_id");



CREATE INDEX "user_brackets_year_id_idx" ON "public"."user_brackets" USING "btree" ("year_id");



CREATE UNIQUE INDEX "user_picks_bracket_id_game_id_idx" ON "public"."user_picks" USING "btree" ("bracket_id", "game_id");



CREATE INDEX "user_picks_game_id_idx" ON "public"."user_picks" USING "btree" ("game_id");



CREATE INDEX "user_total_stats_user_id_idx" ON "public"."user_total_stats" USING "btree" ("user_id");



CREATE INDEX "user_total_stats_year_id_high_score_idx" ON "public"."user_total_stats" USING "btree" ("year_id", "high_score" DESC);



CREATE INDEX "user_total_stats_year_id_idx" ON "public"."user_total_stats" USING "btree" ("year_id");



CREATE OR REPLACE TRIGGER "global_conference_stats_updated_at" BEFORE UPDATE ON "public"."global_conference_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "global_team_stats_updated_at" BEFORE UPDATE ON "public"."global_team_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "seed_matchup_stats_updated_at" BEFORE UPDATE ON "public"."seed_matchup_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tournament_scoring_rules_updated_at" BEFORE UPDATE ON "public"."tournament_scoring_rules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "user_bracket_stats_updated_at" BEFORE UPDATE ON "public"."user_bracket_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "user_total_stats_updated_at" BEFORE UPDATE ON "public"."user_total_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."global_conference_stats"
    ADD CONSTRAINT "global_conference_stats_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."global_conference_stats"
    ADD CONSTRAINT "global_conference_stats_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."global_team_stats"
    ADD CONSTRAINT "global_team_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."global_team_stats"
    ADD CONSTRAINT "global_team_stats_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_favorite_team_id_fkey" FOREIGN KEY ("favorite_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."seed_matchup_stats"
    ADD CONSTRAINT "seed_matchup_stats_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seed_matchup_stats"
    ADD CONSTRAINT "seed_matchup_stats_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_games"
    ADD CONSTRAINT "tournament_games_favored_team_id_fkey" FOREIGN KEY ("favored_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_games"
    ADD CONSTRAINT "tournament_games_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_games"
    ADD CONSTRAINT "tournament_games_underdog_team_id_fkey" FOREIGN KEY ("underdog_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_games"
    ADD CONSTRAINT "tournament_games_winning_team_id_fkey" FOREIGN KEY ("winning_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_games"
    ADD CONSTRAINT "tournament_games_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_round_scoring"
    ADD CONSTRAINT "tournament_round_scoring_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id");



ALTER TABLE ONLY "public"."tournament_scoring_rules"
    ADD CONSTRAINT "tournament_scoring_rules_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_bracket_stats"
    ADD CONSTRAINT "user_bracket_stats_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "public"."user_brackets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_bracket_stats"
    ADD CONSTRAINT "user_bracket_stats_champion_picked_team_id_fkey" FOREIGN KEY ("champion_picked_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_bracket_stats"
    ADD CONSTRAINT "user_bracket_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_bracket_stats"
    ADD CONSTRAINT "user_bracket_stats_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_brackets"
    ADD CONSTRAINT "user_brackets_tournament_scoring_rules_id_fkey" FOREIGN KEY ("tournament_scoring_rules_id") REFERENCES "public"."tournament_scoring_rules"("id");



ALTER TABLE ONLY "public"."user_brackets"
    ADD CONSTRAINT "user_brackets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_brackets"
    ADD CONSTRAINT "user_brackets_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_picks"
    ADD CONSTRAINT "user_picks_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "public"."user_brackets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_picks"
    ADD CONSTRAINT "user_picks_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."tournament_games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_picks"
    ADD CONSTRAINT "user_picks_picked_team_id_fkey" FOREIGN KEY ("picked_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_total_stats"
    ADD CONSTRAINT "user_total_stats_top_picked_champion_id_fkey" FOREIGN KEY ("top_picked_champion_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_total_stats"
    ADD CONSTRAINT "user_total_stats_top_picked_conference_id_fkey" FOREIGN KEY ("top_picked_conference_id") REFERENCES "public"."conferences"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_total_stats"
    ADD CONSTRAINT "user_total_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_total_stats"
    ADD CONSTRAINT "user_total_stats_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE CASCADE;



CREATE POLICY "Allow role-based select on tournament_round_scoring" ON "public"."tournament_round_scoring" FOR SELECT TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = ANY (ARRAY['admin'::"text", 'scorer'::"text", 'organizer'::"text"])));



ALTER TABLE "public"."conferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conferences_select_public" ON "public"."conferences" FOR SELECT USING (true);



ALTER TABLE "public"."global_conference_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "global_conference_stats_select_authenticated" ON "public"."global_conference_stats" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."global_team_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "global_team_stats_select_authenticated" ON "public"."global_team_stats" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_own" ON "public"."profiles" FOR DELETE USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_insert_authenticated" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_insert_from_trigger" ON "public"."profiles" FOR INSERT TO "postgres" WITH CHECK (true);



CREATE POLICY "profiles_select_public" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."rounds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rounds_select_public" ON "public"."rounds" FOR SELECT USING (true);



ALTER TABLE "public"."seed_matchup_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seed_matchup_stats_no_direct_inserts" ON "public"."seed_matchup_stats" FOR INSERT WITH CHECK (false);



CREATE POLICY "seed_matchup_stats_select_public" ON "public"."seed_matchup_stats" FOR SELECT USING (true);



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_select_public" ON "public"."teams" FOR SELECT USING (true);



ALTER TABLE "public"."tournament_games" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tournament_games_insert_authenticated" ON "public"."tournament_games" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "tournament_games_select_public" ON "public"."tournament_games" FOR SELECT USING (true);



ALTER TABLE "public"."tournament_round_scoring" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_scoring_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tournament_scoring_rules_no_direct_inserts" ON "public"."tournament_scoring_rules" FOR INSERT WITH CHECK (false);



CREATE POLICY "tournament_scoring_rules_select_public" ON "public"."tournament_scoring_rules" FOR SELECT USING (true);



ALTER TABLE "public"."user_bracket_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_bracket_stats_select_authenticated" ON "public"."user_bracket_stats" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_brackets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_brackets_delete_authenticated" ON "public"."user_brackets" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_brackets_insert_anon" ON "public"."user_brackets" FOR INSERT TO "anon" WITH CHECK ((("user_id" IS NULL) AND ("anon_user_id" IS NOT NULL)));



CREATE POLICY "user_brackets_insert_authenticated" ON "public"."user_brackets" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("anon_user_id" IS NULL)));



CREATE POLICY "user_brackets_select_authenticated" ON "public"."user_brackets" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_brackets_update_authenticated" ON "public"."user_brackets" FOR UPDATE TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_picks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_picks_delete_own" ON "public"."user_picks" FOR DELETE USING (("bracket_id" IN ( SELECT "user_brackets"."id"
   FROM "public"."user_brackets"
  WHERE ("user_brackets"."user_id" = "auth"."uid"()))));



CREATE POLICY "user_picks_insert_authenticated" ON "public"."user_picks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "user_picks_select_own" ON "public"."user_picks" FOR SELECT USING (("bracket_id" IN ( SELECT "user_brackets"."id"
   FROM "public"."user_brackets"
  WHERE ("user_brackets"."user_id" = "auth"."uid"()))));



CREATE POLICY "user_picks_update_own" ON "public"."user_picks" FOR UPDATE WITH CHECK (("bracket_id" IN ( SELECT "user_brackets"."id"
   FROM "public"."user_brackets"
  WHERE ("user_brackets"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."user_total_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_total_stats_select_authenticated" ON "public"."user_total_stats" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."years" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "years_select_public" ON "public"."years" FOR SELECT USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."debug_auth_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_auth_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_auth_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_profile_exists"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_most_upset_teams_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_most_upset_teams_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_most_upset_teams_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_seed_matchup_upset_percentages_by_year_and_round"("p_year_id" "uuid", "p_round_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_seed_matchup_upset_percentages_by_year_and_round"("p_year_id" "uuid", "p_round_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_seed_matchup_upset_percentages_by_year_and_round"("p_year_id" "uuid", "p_round_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teams_that_caused_most_upsets_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teams_that_caused_most_upsets_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teams_that_caused_most_upsets_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teams_with_most_championships_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_championships_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_championships_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teams_with_most_elite_eight_appearances_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_elite_eight_appearances_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_elite_eight_appearances_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teams_with_most_final_four_appearances_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_final_four_appearances_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_final_four_appearances_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teams_with_most_finals_appearances_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_finals_appearances_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_finals_appearances_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teams_with_most_second_round_appearances_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_second_round_appearances_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_second_round_appearances_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teams_with_most_sweet_sixteen_appearances_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_sweet_sixteen_appearances_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_sweet_sixteen_appearances_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teams_with_most_tournament_appearances_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_tournament_appearances_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teams_with_most_tournament_appearances_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_performing_conferences_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_performing_conferences_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_performing_conferences_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_performing_non_power_conference_teams_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_performing_non_power_conference_teams_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_performing_non_power_conference_teams_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_performing_non_power_conferences_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_performing_non_power_conferences_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_performing_non_power_conferences_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_performing_teams_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_performing_teams_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_performing_teams_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_picked_conferences_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_picked_conferences_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_picked_conferences_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_picked_teams_by_year"("p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_picked_teams_by_year"("p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_picked_teams_by_year"("p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_picked_teams_for_user_and_year"("p_user_id" "uuid", "p_year_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_picked_teams_for_user_and_year"("p_user_id" "uuid", "p_year_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_picked_teams_for_user_and_year"("p_user_id" "uuid", "p_year_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
























GRANT ALL ON TABLE "public"."conferences" TO "anon";
GRANT ALL ON TABLE "public"."conferences" TO "authenticated";
GRANT ALL ON TABLE "public"."conferences" TO "service_role";



GRANT ALL ON TABLE "public"."global_conference_stats" TO "anon";
GRANT ALL ON TABLE "public"."global_conference_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."global_conference_stats" TO "service_role";



GRANT ALL ON TABLE "public"."global_team_stats" TO "anon";
GRANT ALL ON TABLE "public"."global_team_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."global_team_stats" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rounds" TO "anon";
GRANT ALL ON TABLE "public"."rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."rounds" TO "service_role";



GRANT ALL ON TABLE "public"."seed_matchup_stats" TO "anon";
GRANT ALL ON TABLE "public"."seed_matchup_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."seed_matchup_stats" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_games" TO "anon";
GRANT ALL ON TABLE "public"."tournament_games" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_games" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_round_scoring" TO "anon";
GRANT ALL ON TABLE "public"."tournament_round_scoring" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_round_scoring" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_scoring_rules" TO "anon";
GRANT ALL ON TABLE "public"."tournament_scoring_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_scoring_rules" TO "service_role";



GRANT ALL ON TABLE "public"."user_bracket_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_bracket_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_bracket_stats" TO "service_role";



GRANT ALL ON TABLE "public"."user_brackets" TO "anon";
GRANT ALL ON TABLE "public"."user_brackets" TO "authenticated";
GRANT ALL ON TABLE "public"."user_brackets" TO "service_role";



GRANT ALL ON TABLE "public"."user_picks" TO "anon";
GRANT ALL ON TABLE "public"."user_picks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_picks" TO "service_role";



GRANT ALL ON TABLE "public"."user_total_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_total_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_total_stats" TO "service_role";



GRANT ALL ON TABLE "public"."years" TO "anon";
GRANT ALL ON TABLE "public"."years" TO "authenticated";
GRANT ALL ON TABLE "public"."years" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































