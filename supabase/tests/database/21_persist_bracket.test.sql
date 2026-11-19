begin;
select plan(55);

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx values
  ('user_a', tests.create_user('pb-a@test.dev')),
  ('y1', tests.create_year(2093)),
  ('y2', tests.create_year(2094)),
  ('conf', tests.create_conference('PB Conf', false)),
  ('r1', tests.create_round('pb round 1')),
  ('r2', tests.create_round('pb round 2'));
insert into fx values
  ('rules1', tests.create_scoring_rules((select id from fx where name = 'y1'))),
  ('rules2', tests.create_scoring_rules((select id from fx where name = 'y2'))),
  ('t1', tests.create_team('PB Team 1', (select id from fx where name = 'y1'), (select id from fx where name = 'conf'))),
  ('t2', tests.create_team('PB Team 2', (select id from fx where name = 'y1'), (select id from fx where name = 'conf'))),
  ('t4', tests.create_team('PB Team 4', (select id from fx where name = 'y1'), (select id from fx where name = 'conf'))),
  ('t3', tests.create_team('PB Team 3', (select id from fx where name = 'y2'), (select id from fx where name = 'conf')));

-- a valid payload with p_games games: the first 4 are play-in games without a pick
create function pg_temp.payload(p_owner uuid, p_anon uuid, p_rules uuid, p_games int, p_team uuid)
returns jsonb language sql as $$
  select jsonb_build_object(
    'bracket', jsonb_build_object(
      'user_id', p_owner, 'anon_user_id', p_anon,
      'year_id', (select id from fx where name = 'y1'),
      'tournament_scoring_rules_id', p_rules, 'score', 630),
    'games', (
      select coalesce(jsonb_agg(
        case when g <= 4 then jsonb_build_object(
          'round_id', (select id from fx where name = 'r1'), 'is_play_in', true,
          'favored_team_id', (select id from fx where name = 't1'), 'favored_team_seed', 11, 'favored_team_score', 66,
          'underdog_team_id', p_team, 'underdog_team_seed', 11, 'underdog_team_score', 61,
          'winning_team_id', (select id from fx where name = 't1'),
          'pick', null)
        else jsonb_build_object(
          'round_id', (select id from fx where name = 'r2'), 'is_play_in', false,
          'favored_team_id', (select id from fx where name = 't1'), 'favored_team_seed', 1, 'favored_team_score', 70,
          'underdog_team_id', p_team, 'underdog_team_seed', 16, 'underdog_team_score', 60,
          'winning_team_id', (select id from fx where name = 't1'),
          'pick', jsonb_build_object('picked_team_id', (select id from fx where name = 't1'), 'picked_team_seed', 1))
        end order by g), '[]'::jsonb)
      from generate_series(1, p_games) g));
$$;
grant execute on function pg_temp.payload(uuid, uuid, uuid, int, uuid) to anon, authenticated, service_role;

select has_function('public', 'persist_bracket', array['jsonb'], 'persist_bracket exists');
select col_is_null('public', 'tournament_games', 'bracket_id', 'tournament_games.bracket_id is nullable');

-- only service_role may call it
select tests.authenticate_as_anon();
select throws_ok($$select public.persist_bracket(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')))$$,
  '42501', null, 'anon cannot call persist_bracket');
select tests.authenticate_as((select id from fx where name = 'user_a'));
select throws_ok($$select public.persist_bracket(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')))$$,
  '42501', null, 'authenticated cannot call persist_bracket');

-- success
select tests.authenticate_as_service_role();
insert into fx select 'new', public.persist_bracket(
  pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')));
select is((select id is not null from fx where name = 'new'), true, 'persist_bracket returns the new bracket id');
select is((select score from public.user_brackets where id = (select id from fx where name = 'new')), 630,
  'one bracket saved with its score');
select is((select count(*) from public.tournament_games where bracket_id = (select id from fx where name = 'new')), 67::bigint,
  '67 games saved with the bracket id');
select is((select count(*) from public.user_picks where bracket_id = (select id from fx where name = 'new')), 63::bigint,
  '63 picks saved');
select is((select count(*) from public.tournament_games
           where bracket_id = (select id from fx where name = 'new') and is_play_in and favored_team_score = 66), 4::bigint,
  'the 4 play-in games keep their scores');

-- rejections leave nothing behind
select throws_ok($$select public.persist_bracket(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules2'), 67, (select id from fx where name = 't2')))$$,
  '22023', 'persist_bracket: scoring rules do not belong to the bracket year', 'rules from another year are rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after rules from another year');

select throws_ok($$select public.persist_bracket(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 66, (select id from fx where name = 't2')))$$,
  '22023', 'persist_bracket: expected exactly 67 games', '66 games are rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after 66 games');

select throws_ok($$select public.persist_bracket(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't3')))$$,
  '22023', 'persist_bracket: every team must be a team of the bracket year', 'a team from another year is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a team from another year');

select throws_ok($$select public.persist_bracket(jsonb_set(
    pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')),
    '{games,10,winning_team_id}', to_jsonb((select id from fx where name = 't4'))))$$,
  '22023', 'persist_bracket: a winner must be one of the two teams in the game', 'a winner who did not play is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a winner who did not play');

select throws_ok($$select public.persist_bracket(jsonb_set(
    pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')),
    '{games,0,pick}', jsonb_build_object('picked_team_id', (select id from fx where name = 't1'), 'picked_team_seed', 1)))$$,
  '22023', 'persist_bracket: expected exactly 4 play-in games, none with a pick', 'a play-in game with a pick is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a play-in game with a pick');

select throws_ok($$select public.persist_bracket(pg_temp.payload(null, null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')))$$,
  '22023', 'persist_bracket: exactly one of user_id and anon_user_id is required', 'an owner-less bracket is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after an owner-less bracket');
select throws_ok($$select public.persist_bracket(pg_temp.payload((select id from fx where name = 'user_a'), gen_random_uuid(), (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')))$$,
  '22023', 'persist_bracket: exactly one of user_id and anon_user_id is required', 'a bracket with both owners is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a bracket with both owners');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{games,10,pick}', 'null'::jsonb))$$,
  '22023', 'persist_bracket: expected exactly 63 picks', '62 picks are rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after 62 picks');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{bracket,score}', '-1'::jsonb))$$,
  '22023', 'persist_bracket: score must be at least 0', 'a negative score is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a negative score');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{games,10,favored_team_id}', 'null'::jsonb))$$,
  '22023', 'persist_bracket: every team must be a team of the bracket year', 'a null team id is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a null team id');

select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{games,10,underdog_team_id}', to_jsonb((select id from fx where name = 't1'))))$$,
  '22023', 'persist_bracket: a game needs two different teams', 'a team playing itself is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a team playing itself');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{bracket,score}', 'null'::jsonb))$$,
  '22023', 'persist_bracket: score is required', 'a missing score is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a missing score');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{bracket,year_id}', 'null'::jsonb))$$,
  '22023', 'persist_bracket: year_id is required', 'a missing year is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a missing year');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{games}', '{}'::jsonb))$$,
  '22023', 'persist_bracket: expected exactly 67 games', 'a games object is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a games object');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{games,10,round_id}', 'null'::jsonb))$$,
  '22023', 'persist_bracket: every game needs a round, both seeds and both scores', 'a missing round is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a missing round');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{games,10,round_id}', to_jsonb(gen_random_uuid())))$$,
  '22023', 'persist_bracket: every game needs a round, both seeds and both scores', 'an unknown round is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after an unknown round');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{games,10,favored_team_seed}', 'null'::jsonb))$$,
  '22023', 'persist_bracket: every game needs a round, both seeds and both scores', 'a missing seed is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a missing seed');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{games,10,underdog_team_score}', 'null'::jsonb))$$,
  '22023', 'persist_bracket: every game needs a round, both seeds and both scores', 'a missing game score is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a missing game score');
select throws_ok($$select public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')), '{games,10,pick,picked_team_seed}', 'null'::jsonb))$$,
  '22023', 'persist_bracket: every pick needs a team and a seed', 'a pick without a seed is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a pick without a seed');

-- anonymous owner
insert into fx select 'anon_bracket', public.persist_bracket(pg_temp.payload(null, '00000000-0000-4000-8000-0000000000a1'::uuid, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')));
select is((select count(*) from public.user_brackets
           where id = (select id from fx where name = 'anon_bracket')
             and anon_user_id = '00000000-0000-4000-8000-0000000000a1' and user_id is null), 1::bigint,
  'an anonymous bracket is saved with its anon id');

-- team ids compare as uuids, whatever their letter case
insert into fx select 'upper_winner', public.persist_bracket(jsonb_set(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')),
  '{games,10,winning_team_id}', to_jsonb(upper((select id from fx where name = 't1')::text))));
select is((select count(*) from public.tournament_games where bracket_id = (select id from fx where name = 'upper_winner')), 67::bigint,
  'a winner id in upper case is accepted');

-- legacy backfill. The migration ran on an empty DB, so this repeats its exact
-- UPDATE statement (keep the two in sync) against rows shaped like the old app's (null bracket_id).
with ins as (
  insert into public.user_brackets (anon_user_id, year_id, tournament_scoring_rules_id, score)
  values ('00000000-0000-4000-8000-0000000000b1', (select id from fx where name = 'y1'), (select id from fx where name = 'rules1'), 0)
  returning id)
insert into fx select 'legacy', id from ins;
with ins as (
  insert into public.tournament_games (year_id, round_id, is_play_in, favored_team_id, favored_team_seed, favored_team_score,
    underdog_team_id, underdog_team_seed, underdog_team_score, winning_team_id)
  values ((select id from fx where name = 'y1'), (select id from fx where name = 'r2'), false,
    (select id from fx where name = 't1'), 1, 70, (select id from fx where name = 't2'), 16, 60, (select id from fx where name = 't1'))
  returning id)
insert into fx select 'legacy_game', id from ins;
with ins as (
  insert into public.tournament_games (year_id, round_id, is_play_in, favored_team_id, favored_team_seed, favored_team_score,
    underdog_team_id, underdog_team_seed, underdog_team_score, winning_team_id)
  values ((select id from fx where name = 'y1'), (select id from fx where name = 'r1'), true,
    (select id from fx where name = 't1'), 11, 66, (select id from fx where name = 't2'), 11, 61, (select id from fx where name = 't1'))
  returning id)
insert into fx select 'legacy_playin', id from ins;
insert into public.user_picks (bracket_id, game_id, picked_team_id, picked_team_seed)
values ((select id from fx where name = 'legacy'), (select id from fx where name = 'legacy_game'), (select id from fx where name = 't1'), 1);

update public.tournament_games g
set bracket_id = p.bracket_id
from public.user_picks p
where p.game_id = g.id and g.bracket_id is null;

select is((select bracket_id from public.tournament_games where id = (select id from fx where name = 'legacy_game')),
  (select id from fx where name = 'legacy'), 'backfill gives a picked legacy game its bracket id');
select is((select bracket_id from public.tournament_games where id = (select id from fx where name = 'legacy_playin')),
  null::uuid, 'backfill leaves a legacy play-in game null');

-- schema
select fk_ok('public', 'tournament_games', 'bracket_id', 'public', 'user_brackets', 'id', 'bracket_id references user_brackets');
select has_index('public', 'tournament_games', 'tournament_games_bracket_id_idx', 'bracket_id is indexed');
delete from public.user_brackets where id = (select id from fx where name = 'new');
select is((select count(*) from public.tournament_games where bracket_id = (select id from fx where name = 'new')), 0::bigint,
  'deleting a bracket deletes its games');
select is((select count(*) from public.user_picks where bracket_id = (select id from fx where name = 'new')), 0::bigint,
  'deleting a bracket deletes its picks');

select * from finish();
rollback;
