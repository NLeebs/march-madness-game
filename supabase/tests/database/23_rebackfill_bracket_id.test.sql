begin;
select plan(4);

-- 9a-2 re-runs public.backfill_tournament_game_brackets() in a migration, for
-- brackets the old app saved after the 9a-1 migration (bracket_id null on all
-- their games). Test 21 covers the function's edge cases; this checks the
-- migration exists and that its statement links a legacy bracket saved after
-- 9a-1: a picked game and an unpicked play-in game saved within 5s of it.

select is((select count(*) from supabase_migrations.schema_migrations
           where name = 'rebackfill_tournament_games_bracket_id'), 1::bigint,
  'the re-backfill migration is applied');

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
insert into fx values
  ('y1', tests.create_year(2091)),
  ('conf', tests.create_conference('RB Conf', false)),
  ('r1', tests.create_round('rb round 1'));
insert into fx values
  ('rules1', tests.create_scoring_rules((select id from fx where name = 'y1'))),
  ('t1', tests.create_team('RB Team 1', (select id from fx where name = 'y1'), (select id from fx where name = 'conf'))),
  ('t2', tests.create_team('RB Team 2', (select id from fx where name = 'y1'), (select id from fx where name = 'conf')));
with b as (
  insert into public.user_brackets (anon_user_id, year_id, tournament_scoring_rules_id, score)
  values ('00000000-0000-4000-8000-0000000000c1', (select id from fx where name = 'y1'), (select id from fx where name = 'rules1'), 0)
  returning id)
insert into fx select 'legacy', id from b;

-- the old app: games one request at a time, bracket_id never set, no pick on play-ins
create function pg_temp.legacy_game(p_play_in boolean, p_at timestamptz) returns uuid language sql as $$
  insert into public.tournament_games (year_id, round_id, is_play_in, favored_team_id, favored_team_seed, favored_team_score,
    underdog_team_id, underdog_team_seed, underdog_team_score, winning_team_id, created_at)
  values ((select id from fx where name = 'y1'), (select id from fx where name = 'r1'), p_play_in,
    (select id from fx where name = 't1'), 1, 70, (select id from fx where name = 't2'), 16, 60, (select id from fx where name = 't1'), p_at)
  returning id;
$$;
insert into fx values
  ('picked_game', pg_temp.legacy_game(false, '2026-11-20 12:00:00+00')),
  ('playin_game', pg_temp.legacy_game(true, '2026-11-20 12:00:01+00'));
insert into public.user_picks (bracket_id, game_id, picked_team_id, picked_team_seed) values
  ((select id from fx where name = 'legacy'), (select id from fx where name = 'picked_game'), (select id from fx where name = 't1'), 1);

select is((select count(*) from public.tournament_games
           where id in (select id from fx where name in ('picked_game', 'playin_game')) and bracket_id is null), 2::bigint,
  'legacy games start without a bracket id');

-- the migration's statement, run as the migration role
select public.backfill_tournament_game_brackets();

select is((select bracket_id from public.tournament_games where id = (select id from fx where name = 'picked_game')),
  (select id from fx where name = 'legacy'), 're-backfill gives a picked legacy game its bracket id');
select is((select bracket_id from public.tournament_games where id = (select id from fx where name = 'playin_game')),
  (select id from fx where name = 'legacy'), 're-backfill gives the legacy play-in game saved within 5s its bracket id');

select * from finish();
rollback;
