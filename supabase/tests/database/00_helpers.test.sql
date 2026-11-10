begin;
create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

create or replace function tests.create_user(p_email text) returns uuid
language plpgsql security invoker as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, aud, role, instance_id)
  values (v_id, p_email, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  return v_id;
end $$;

create or replace function tests.authenticate_as(p_user_id uuid, p_extra_claims jsonb default '{}')
returns void language plpgsql security invoker as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    (jsonb_build_object('sub', p_user_id, 'role', 'authenticated') || p_extra_claims)::text, true);
end $$;

create or replace function tests.authenticate_as_anon() returns void
language plpgsql security invoker as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

create or replace function tests.authenticate_as_service_role() returns void
language plpgsql security invoker as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
end $$;

create or replace function tests.clear_authentication() returns void
language plpgsql security invoker as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

create or replace function tests.create_year(p_year int) returns uuid
language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.years (year) values (p_year) returning id into v_id;
  return v_id;
end $$;

create or replace function tests.create_scoring_rules(p_year_id uuid) returns uuid
language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.tournament_scoring_rules (year_id, description, version)
  values (p_year_id, 'test rules', 'test') returning id into v_id;
  return v_id;
end $$;

create or replace function tests.create_round(p_name text) returns uuid
language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.rounds (round_name) values (p_name) returning id into v_id;
  return v_id;
end $$;

create or replace function tests.create_conference(p_name text, p_is_power boolean, p_logo text default null)
returns uuid language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.conferences (conference, is_power_conference, conference_logo)
  values (p_name, p_is_power, p_logo) returning id into v_id;
  return v_id;
end $$;

create or replace function tests.create_team(p_name text, p_year_id uuid, p_conference_id uuid, p_logo text default null)
returns uuid language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.teams (name, year_id, conference_id, team_logo)
  values (p_name, p_year_id, p_conference_id, p_logo) returning id into v_id;
  return v_id;
end $$;

create or replace function tests.create_game(p_year_id uuid, p_round_id uuid) returns uuid
language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.tournament_games (year_id, round_id)
  values (p_year_id, p_round_id) returning id into v_id;
  return v_id;
end $$;

create or replace function tests.create_bracket(p_user_id uuid, p_year_id uuid) returns uuid
language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.user_brackets (user_id, year_id, tournament_scoring_rules_id)
  values (p_user_id, p_year_id,
    (select id from public.tournament_scoring_rules where year_id = p_year_id limit 1))
  returning id into v_id;
  return v_id;
end $$;

create or replace function tests.create_anon_bracket(p_anon_user_id uuid, p_year_id uuid) returns uuid
language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.user_brackets (anon_user_id, year_id, tournament_scoring_rules_id)
  values (p_anon_user_id, p_year_id,
    (select id from public.tournament_scoring_rules where year_id = p_year_id limit 1))
  returning id into v_id;
  return v_id;
end $$;

create or replace function tests.create_played_game(
  p_year_id uuid, p_round_id uuid,
  p_favored uuid, p_favored_seed int,
  p_underdog uuid, p_underdog_seed int,
  p_winner uuid, p_is_play_in boolean default false) returns uuid
language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.tournament_games
    (year_id, round_id, is_play_in, favored_team_id, favored_team_seed,
     underdog_team_id, underdog_team_seed, winning_team_id)
  values (p_year_id, p_round_id, p_is_play_in, p_favored, p_favored_seed,
     p_underdog, p_underdog_seed, p_winner)
  returning id into v_id;
  return v_id;
end $$;

create or replace function tests.create_pick(p_bracket_id uuid, p_game_id uuid, p_team_id uuid, p_seed int)
returns uuid language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.user_picks (bracket_id, game_id, picked_team_id, picked_team_seed)
  values (p_bracket_id, p_game_id, p_team_id, p_seed) returning id into v_id;
  return v_id;
end $$;

create or replace function tests.create_bracket_with_score(
  p_user_id uuid, p_year_id uuid, p_score int, p_created_at timestamptz) returns uuid
language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into public.user_brackets (user_id, year_id, tournament_scoring_rules_id, score, created_at)
  values (p_user_id, p_year_id,
    (select id from public.tournament_scoring_rules where year_id = p_year_id limit 1),
    p_score, p_created_at)
  returning id into v_id;
  return v_id;
end $$;

select plan(6);
select has_table('public', 'user_brackets', 'baseline schema is loaded');
select has_function('tests', 'authenticate_as', array['uuid','jsonb'], 'helpers installed');
select has_function('tests', 'create_played_game',
  array['uuid','uuid','uuid','integer','uuid','integer','uuid','boolean'], 'create_played_game installed');
select has_function('tests', 'create_pick', array['uuid','uuid','uuid','integer'], 'create_pick installed');
select has_function('tests', 'create_bracket_with_score',
  array['uuid','uuid','integer','timestamp with time zone'], 'create_bracket_with_score installed');
select is(
  (select tests.create_user('smoke-' || gen_random_uuid() || '@test.dev') is not null), true, 'can create auth users');
select * from finish();
commit;
