begin;
select plan(15);

select tests.clear_authentication();
delete from stats.refresh_log where job = 'user_total_stats';

create temp table fx (name text primary key, id uuid);
insert into fx values
  ('y', tests.create_year(2093)),
  ('y2', tests.create_year(2092)),
  ('u1', tests.create_user('uts-u1@test.dev')),
  ('u2', tests.create_user('uts-u2@test.dev')),
  ('u3', tests.create_user('uts-u3@test.dev')),
  ('power', tests.create_conference('uts-power', true)),
  ('mid', tests.create_conference('uts-mid', false)),
  ('r1', tests.create_round('1')),
  ('rf', tests.create_round('finals'));
insert into fx values
  ('rules', tests.create_scoring_rules((select id from fx where name = 'y'))),
  ('rules2', tests.create_scoring_rules((select id from fx where name = 'y2')));

create function pg_temp.fx(p text) returns uuid language sql as $$ select id from fx where name = p $$;

insert into fx values
  ('a', tests.create_team('A', pg_temp.fx('y'), pg_temp.fx('power'))),
  ('b', tests.create_team('B', pg_temp.fx('y'), pg_temp.fx('mid'))),
  ('c_', tests.create_team('C', pg_temp.fx('y'), pg_temp.fx('power'))),
  ('d', tests.create_team('D', pg_temp.fx('y'), pg_temp.fx('mid')));

insert into fx values
  ('g1', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('a'), 1, pg_temp.fx('b'), 16, pg_temp.fx('b'))),
  ('g2', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('c_'), 4, pg_temp.fx('d'), 13, pg_temp.fx('c_'))),
  ('g5', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('rf'), pg_temp.fx('c_'), 4, pg_temp.fx('b'), 16, pg_temp.fx('c_'))),
  ('g6', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('a'), 1, pg_temp.fx('d'), 13, null));

-- U1/Y: 11 brackets, scores 10..110, n = 1..11 (110 is newest)
insert into fx
  select 'u1b' || n,
         tests.create_bracket_with_score(pg_temp.fx('u1'), pg_temp.fx('y'), 10 * n,
           '2026-01-01'::timestamptz + n * interval '1 hour')
  from generate_series(1, 11) n;
-- U2/Y: scores 500, 300
insert into fx values
  ('u2b1', tests.create_bracket_with_score(pg_temp.fx('u2'), pg_temp.fx('y'), 500, '2026-01-01'::timestamptz + 1 * interval '1 hour')),
  ('u2b2', tests.create_bracket_with_score(pg_temp.fx('u2'), pg_temp.fx('y'), 300, '2026-01-01'::timestamptz + 2 * interval '1 hour'));
-- U3/Y: 5 brackets of 60
insert into fx
  select 'u3b' || n,
         tests.create_bracket_with_score(pg_temp.fx('u3'), pg_temp.fx('y'), 60,
           '2026-01-01'::timestamptz + n * interval '1 hour')
  from generate_series(1, 5) n;
-- U1/Y2: one bracket of 999
insert into fx values
  ('u1y2', tests.create_bracket_with_score(pg_temp.fx('u1'), pg_temp.fx('y2'), 999, '2026-01-01'::timestamptz + 1 * interval '1 hour'));

do $$ begin
  perform tests.create_pick(pg_temp.fx('u1b11'), pg_temp.fx('g1'), pg_temp.fx('b'), 16);
  perform tests.create_pick(pg_temp.fx('u1b11'), pg_temp.fx('g2'), pg_temp.fx('d'), 13);
  perform tests.create_pick(pg_temp.fx('u1b11'), pg_temp.fx('g5'), pg_temp.fx('c_'), 4);
  perform tests.create_pick(pg_temp.fx('u1b11'), pg_temp.fx('g6'), pg_temp.fx('a'), 1);
  perform tests.create_pick(pg_temp.fx('u1b10'), pg_temp.fx('g5'), pg_temp.fx('b'), 16);
end $$;

select is(stats.refresh_user_total_stats(), true, 'returns true when inputs changed');

create function pg_temp.uts(p_user text, p_year text) returns setof public.user_total_stats
language sql as $$
  select * from public.user_total_stats
  where user_id = pg_temp.fx(p_user) and year_id = pg_temp.fx(p_year)
$$;

select results_eq(
  $q$select total_brackets, high_score, low_score, average_score,
       last_three_average_score, last_ten_average_score from pg_temp.uts('u1', 'y')$q$,
  $q$select 11::numeric, 110::numeric, 10::numeric, 60::numeric, 100::numeric, 65::numeric$q$,
  'U1/Y totals and ordered averages');

select results_eq(
  $q$select high_score_rank, average_score_rank, champions_guessed_correctly_rank from pg_temp.uts('u1', 'y')$q$,
  $q$select 2::numeric, 1::numeric, 1::numeric$q$,
  'U1/Y ranks');

select results_eq(
  $q$select total_picks, total_correct_picks, correct_pick_percentage,
       total_round_ones_picked, rounds_ones_guessed_correctly, round_one_correct_percentage,
       total_first_round_upsets_picked, total_first_round_upsets_correct,
       first_round_upsets_correct_percentage from pg_temp.uts('u1', 'y')$q$,
  $q$select 4::numeric, 2::numeric, 50.0::numeric, 2::numeric, 1::numeric, 50.0::numeric,
       2::numeric, 1::numeric, 50.0::numeric$q$,
  'U1/Y picks count resolved picks only');

select results_eq(
  $q$select champions_guessed_correctly, champion_correct_percentage,
       top_picked_champion_id, total_top_picked_champion_picks,
       top_picked_conference_id, total_top_picked_conference_picks from pg_temp.uts('u1', 'y')$q$,
  format($q$select 1::numeric, 50.0::numeric, %L::uuid, 1::numeric, %L::uuid, 3::numeric$q$,
    pg_temp.fx('c_'), pg_temp.fx('mid')),
  'U1/Y champions and top picks (tie broken by newer bracket)');

select results_eq(
  $q$select high_score, high_score_rank, average_score, average_score_rank,
       last_three_average_score, champions_guessed_correctly_rank, top_picked_champion_id
     from pg_temp.uts('u2', 'y')$q$,
  $q$select 500::numeric, 1::numeric, 0::numeric, null::numeric, 0::numeric, 2::numeric, null::uuid$q$,
  'U2/Y: below threshold gets average 0 and null average rank');

select results_eq(
  $q$select average_score, average_score_rank, last_three_average_score,
       last_ten_average_score, high_score_rank from pg_temp.uts('u3', 'y')$q$,
  $q$select 60::numeric, 1::numeric, 60::numeric, 0::numeric, 3::numeric$q$,
  'U3/Y averages and ranks');

select results_eq(
  $q$select high_score_rank from pg_temp.uts('u1', 'y2')$q$,
  $q$select 1::numeric$q$,
  'U1/Y2 ranked within its own year');

create function pg_temp.fixture_rows() returns bigint language sql as $$
  select count(*) from public.user_total_stats
  where user_id in (pg_temp.fx('u1'), pg_temp.fx('u2'), pg_temp.fx('u3')) $$;
select is(pg_temp.fixture_rows(), 4::bigint, 'one row per user and year');

select is(stats.refresh_user_total_stats(), false, 'second call returns false when inputs unchanged');

-- A forced refresh must not rewrite rows whose values did not change
create temp table before_ctid as
  select id, ctid::text as old_ctid from public.user_total_stats
  where user_id in (pg_temp.fx('u1'), pg_temp.fx('u2'), pg_temp.fx('u3'));
delete from stats.refresh_log where job = 'user_total_stats';
select is(stats.refresh_user_total_stats(), true, 'forced refresh runs');
select is_empty(
  $q$select b.id from before_ctid b join public.user_total_stats s using (id) where s.ctid::text <> b.old_ctid$q$,
  'unchanged rows are not rewritten');

delete from public.user_brackets where user_id = pg_temp.fx('u2');
select is(stats.refresh_user_total_stats(), true, 'returns true after brackets deleted');
select is((select count(*) from pg_temp.uts('u2', 'y')), 0::bigint, 'U2/Y row removed when no brackets left');
select is(pg_temp.fixture_rows(), 3::bigint, 'other rows kept');

select * from finish();
rollback;
