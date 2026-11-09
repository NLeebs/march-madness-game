begin;
select plan(5);

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx values
  ('ya', tests.create_year(2093)),
  ('yb', tests.create_year(2094)),
  ('r1', tests.create_round('R1')),
  ('r2', tests.create_round('R2')),
  ('user_a', tests.create_user('rpc-a@test.dev')),
  ('user_b', tests.create_user('rpc-b@test.dev')),
  ('P1', tests.create_conference('P1', 't', 'logo-P1')),
  ('P2', tests.create_conference('P2', 't', 'logo-P2')),
  ('P3', tests.create_conference('P3', 't', 'logo-P3')),
  ('P4', tests.create_conference('P4', 't', 'logo-P4')),
  ('N1', tests.create_conference('N1', 'f', 'logo-N1')),
  ('N2', tests.create_conference('N2', 'f', 'logo-N2')),
  ('N3', tests.create_conference('N3', 'f', 'logo-N3'));

-- conference stats (YA) plus a YB decoy for N1
insert into public.global_conference_stats (year_id, conference_id, wins, picks) values
  ((select id from fx where name = 'ya'), (select id from fx where name = 'P1'), 70, 10),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'P2'), 60, 70),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'P3'), 50, 20),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'P4'), 40, 60),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'N1'), 30, 50),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'N2'), 20, 30),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'N3'), 10, 40),
  ((select id from fx where name = 'yb'), (select id from fx where name = 'N1'), 999, 999);

-- seed matchups
insert into public.seed_matchup_stats (year_id, round_id, higher_seed, lower_seed, upset_percentage) values
  ((select id from fx where name = 'ya'), (select id from fx where name = 'r1'), 1, 16, 0.05),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'r1'), 2, 15, 0.10),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'r1'), 3, 14, 0.15),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'r1'), 4, 13, 0.20),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'r1'), 5, 12, 0.25),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'r1'), 6, 11, 0.30),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'r1'), 7, 10, 0.35),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'r1'), 8, 9, 0.40),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'r1'), 2, 7, 0.01),
  ((select id from fx where name = 'ya'), (select id from fx where name = 'r2'), 1, 8, 0.99),
  ((select id from fx where name = 'yb'), (select id from fx where name = 'r1'), 1, 16, 0.98);

-- teams, games, brackets, picks
-- scoring rules are required by user_brackets.tournament_scoring_rules_id
select tests.create_scoring_rules((select id from fx where name = 'ya'));
select tests.create_scoring_rules((select id from fx where name = 'yb'));
insert into fx values
  ('T0', tests.create_team('T0', (select id from fx where name = 'ya'), (select id from fx where name = 'P1'), 'logo-T0')),
  ('T1', tests.create_team('T1', (select id from fx where name = 'ya'), (select id from fx where name = 'P1'), 'logo-T1')),
  ('T2', tests.create_team('T2', (select id from fx where name = 'ya'), (select id from fx where name = 'P1'), 'logo-T2')),
  ('T3', tests.create_team('T3', (select id from fx where name = 'ya'), (select id from fx where name = 'P1'), 'logo-T3')),
  ('T4', tests.create_team('T4', (select id from fx where name = 'ya'), (select id from fx where name = 'P1'), 'logo-T4')),
  ('T5', tests.create_team('T5', (select id from fx where name = 'ya'), (select id from fx where name = 'P1'), 'logo-T5')),
  ('G1', tests.create_game((select id from fx where name = 'ya'), (select id from fx where name = 'r1'))),
  ('G2', tests.create_game((select id from fx where name = 'ya'), (select id from fx where name = 'r1'))),
  ('G3', tests.create_game((select id from fx where name = 'ya'), (select id from fx where name = 'r1'))),
  ('G4', tests.create_game((select id from fx where name = 'ya'), (select id from fx where name = 'r1'))),
  ('G5', tests.create_game((select id from fx where name = 'ya'), (select id from fx where name = 'r1'))),
  ('G6', tests.create_game((select id from fx where name = 'ya'), (select id from fx where name = 'r1'))),
  ('G7', tests.create_game((select id from fx where name = 'ya'), (select id from fx where name = 'r1'))),
  ('GY1', tests.create_game((select id from fx where name = 'yb'), (select id from fx where name = 'r1'))),
  ('GY2', tests.create_game((select id from fx where name = 'yb'), (select id from fx where name = 'r1'))),
  ('GY3', tests.create_game((select id from fx where name = 'yb'), (select id from fx where name = 'r1'))),
  ('GY4', tests.create_game((select id from fx where name = 'yb'), (select id from fx where name = 'r1'))),
  ('GY5', tests.create_game((select id from fx where name = 'yb'), (select id from fx where name = 'r1'))),
  ('GY6', tests.create_game((select id from fx where name = 'yb'), (select id from fx where name = 'r1'))),
  ('GY7', tests.create_game((select id from fx where name = 'yb'), (select id from fx where name = 'r1'))),
  ('BA1', tests.create_bracket((select id from fx where name = 'user_a'), (select id from fx where name = 'ya'))),
  ('BA2', tests.create_bracket((select id from fx where name = 'user_a'), (select id from fx where name = 'ya'))),
  ('BA3', tests.create_bracket((select id from fx where name = 'user_a'), (select id from fx where name = 'ya'))),
  ('BB', tests.create_bracket((select id from fx where name = 'user_b'), (select id from fx where name = 'ya'))),
  ('BAY', tests.create_bracket((select id from fx where name = 'user_a'), (select id from fx where name = 'yb')));

-- A: 3 YA brackets x 7 games = T0 x6, T1 x5, T2 x4, T3 x3, T4 x2, T5 x1; B: 7 picks of T5; A YB: 7 picks of T5 on 7 YB games (decoy; without the year filter T5 would reach 8 and top the list)
insert into public.user_picks (bracket_id, game_id, picked_team_id) values
  ((select id from fx where name = 'BA1'), (select id from fx where name = 'G1'), (select id from fx where name = 'T0')),
  ((select id from fx where name = 'BA1'), (select id from fx where name = 'G2'), (select id from fx where name = 'T0')),
  ((select id from fx where name = 'BA1'), (select id from fx where name = 'G3'), (select id from fx where name = 'T0')),
  ((select id from fx where name = 'BA1'), (select id from fx where name = 'G4'), (select id from fx where name = 'T0')),
  ((select id from fx where name = 'BA1'), (select id from fx where name = 'G5'), (select id from fx where name = 'T0')),
  ((select id from fx where name = 'BA1'), (select id from fx where name = 'G6'), (select id from fx where name = 'T0')),
  ((select id from fx where name = 'BA1'), (select id from fx where name = 'G7'), (select id from fx where name = 'T1')),
  ((select id from fx where name = 'BA2'), (select id from fx where name = 'G1'), (select id from fx where name = 'T1')),
  ((select id from fx where name = 'BA2'), (select id from fx where name = 'G2'), (select id from fx where name = 'T1')),
  ((select id from fx where name = 'BA2'), (select id from fx where name = 'G3'), (select id from fx where name = 'T1')),
  ((select id from fx where name = 'BA2'), (select id from fx where name = 'G4'), (select id from fx where name = 'T1')),
  ((select id from fx where name = 'BA2'), (select id from fx where name = 'G5'), (select id from fx where name = 'T2')),
  ((select id from fx where name = 'BA2'), (select id from fx where name = 'G6'), (select id from fx where name = 'T2')),
  ((select id from fx where name = 'BA2'), (select id from fx where name = 'G7'), (select id from fx where name = 'T2')),
  ((select id from fx where name = 'BA3'), (select id from fx where name = 'G1'), (select id from fx where name = 'T2')),
  ((select id from fx where name = 'BA3'), (select id from fx where name = 'G2'), (select id from fx where name = 'T3')),
  ((select id from fx where name = 'BA3'), (select id from fx where name = 'G3'), (select id from fx where name = 'T3')),
  ((select id from fx where name = 'BA3'), (select id from fx where name = 'G4'), (select id from fx where name = 'T3')),
  ((select id from fx where name = 'BA3'), (select id from fx where name = 'G5'), (select id from fx where name = 'T4')),
  ((select id from fx where name = 'BA3'), (select id from fx where name = 'G6'), (select id from fx where name = 'T4')),
  ((select id from fx where name = 'BA3'), (select id from fx where name = 'G7'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BB'), (select id from fx where name = 'G1'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BB'), (select id from fx where name = 'G2'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BB'), (select id from fx where name = 'G3'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BB'), (select id from fx where name = 'G4'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BB'), (select id from fx where name = 'G5'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BB'), (select id from fx where name = 'G6'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BB'), (select id from fx where name = 'G7'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BAY'), (select id from fx where name = 'GY1'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BAY'), (select id from fx where name = 'GY2'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BAY'), (select id from fx where name = 'GY3'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BAY'), (select id from fx where name = 'GY4'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BAY'), (select id from fx where name = 'GY5'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BAY'), (select id from fx where name = 'GY6'), (select id from fx where name = 'T5')),
  ((select id from fx where name = 'BAY'), (select id from fx where name = 'GY7'), (select id from fx where name = 'T5'));

select tests.authenticate_as_service_role();

select results_eq(
  $$select * from public.get_top_performing_conferences_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'P1'), 'P1', 'logo-P1', 70::bigint),
    ((select id from fx where name = 'P2'), 'P2', 'logo-P2', 60::bigint),
    ((select id from fx where name = 'P3'), 'P3', 'logo-P3', 50::bigint),
    ((select id from fx where name = 'P4'), 'P4', 'logo-P4', 40::bigint),
    ((select id from fx where name = 'N1'), 'N1', 'logo-N1', 30::bigint)$$,
  'get_top_performing_conferences_by_year returns top 5 by wins for the year only');

select results_eq(
  $$select * from public.get_top_performing_non_power_conferences_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'N1'), 'N1', 'logo-N1', 30::bigint),
    ((select id from fx where name = 'N2'), 'N2', 'logo-N2', 20::bigint),
    ((select id from fx where name = 'N3'), 'N3', 'logo-N3', 10::bigint)$$,
  'get_top_performing_non_power_conferences_by_year returns only non-power conferences');

-- as-is: filters is_power_conference = false (suspected bug, see docs/DIAGNOSIS.md)
select results_eq(
  $$select * from public.get_top_picked_conferences_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'N1'), 'N1', 'logo-N1', 50::bigint),
    ((select id from fx where name = 'N3'), 'N3', 'logo-N3', 40::bigint),
    ((select id from fx where name = 'N2'), 'N2', 'logo-N2', 30::bigint)$$,
  'get_top_picked_conferences_by_year returns non-power conferences by picks (current behavior)');

select results_eq(
  $$select * from public.get_seed_matchup_upset_percentages_by_year_and_round((select id from fx where name = 'ya'), 'R1')$$,
  $$values
    (0.40::numeric, 8::numeric, 9::numeric, (select id from fx where name = 'r1')),
    (0.35::numeric, 7::numeric, 10::numeric, (select id from fx where name = 'r1')),
    (0.30::numeric, 6::numeric, 11::numeric, (select id from fx where name = 'r1')),
    (0.25::numeric, 5::numeric, 12::numeric, (select id from fx where name = 'r1')),
    (0.20::numeric, 4::numeric, 13::numeric, (select id from fx where name = 'r1')),
    (0.15::numeric, 3::numeric, 14::numeric, (select id from fx where name = 'r1')),
    (0.10::numeric, 2::numeric, 15::numeric, (select id from fx where name = 'r1')),
    (0.05::numeric, 1::numeric, 16::numeric, (select id from fx where name = 'r1'))$$,
  'get_seed_matchup_upset_percentages_by_year_and_round returns 8 rows for year and round, highest first');

select results_eq(
  $$select * from public.get_top_picked_teams_for_user_and_year((select id from fx where name = 'user_a'), (select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'P1'), 6::bigint),
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'P1'), 5::bigint),
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'P1'), 4::bigint),
    ((select id from fx where name = 'T3'), 'T3', 'logo-T3', (select id from fx where name = 'P1'), 3::bigint),
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'P1'), 2::bigint)$$,
  'get_top_picked_teams_for_user_and_year counts only that user and year');

select tests.clear_authentication();
select * from finish();
rollback;
