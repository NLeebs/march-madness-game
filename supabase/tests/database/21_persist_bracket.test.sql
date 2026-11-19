begin;
select plan(19);

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
  '22023', null, 'rules from another year are rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after rules from another year');

select throws_ok($$select public.persist_bracket(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 66, (select id from fx where name = 't2')))$$,
  '22023', null, '66 games are rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after 66 games');

select throws_ok($$select public.persist_bracket(pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't3')))$$,
  '22023', null, 'a team from another year is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a team from another year');

select throws_ok($$select public.persist_bracket(jsonb_set(
    pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')),
    '{games,10,winning_team_id}', to_jsonb((select id from fx where name = 't4'))))$$,
  '22023', null, 'a winner who did not play is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a winner who did not play');

select throws_ok($$select public.persist_bracket(jsonb_set(
    pg_temp.payload((select id from fx where name = 'user_a'), null, (select id from fx where name = 'rules1'), 67, (select id from fx where name = 't2')),
    '{games,0,pick}', jsonb_build_object('picked_team_id', (select id from fx where name = 't1'), 'picked_team_seed', 1)))$$,
  '22023', null, 'a play-in game with a pick is rejected');
select is((select count(*) from public.user_brackets where year_id = (select id from fx where name = 'y1')), 1::bigint,
  'no bracket saved after a play-in game with a pick');

select * from finish();
rollback;
