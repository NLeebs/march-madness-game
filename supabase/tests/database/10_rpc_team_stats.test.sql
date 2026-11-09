begin;
select plan(12);

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx values
  ('ya', tests.create_year(2091)),
  ('yb', tests.create_year(2092)),
  ('Power', tests.create_conference('rpc-Power', true)),
  ('Mid', tests.create_conference('rpc-Mid', false));
insert into fx values
  ('T0', tests.create_team('T0', (select id from fx where name = 'ya'), (select id from fx where name = 'Mid'), 'logo-T0')),
  ('T1', tests.create_team('T1', (select id from fx where name = 'ya'), (select id from fx where name = 'Power'), 'logo-T1')),
  ('T2', tests.create_team('T2', (select id from fx where name = 'ya'), (select id from fx where name = 'Mid'), 'logo-T2')),
  ('T3', tests.create_team('T3', (select id from fx where name = 'ya'), (select id from fx where name = 'Power'), 'logo-T3')),
  ('T4', tests.create_team('T4', (select id from fx where name = 'ya'), (select id from fx where name = 'Mid'), 'logo-T4')),
  ('T5', tests.create_team('T5', (select id from fx where name = 'ya'), (select id from fx where name = 'Power'), 'logo-T5')),
  ('TX', tests.create_team('TX', (select id from fx where name = 'yb'), (select id from fx where name = 'Mid'), 'logo-TX'));

-- YA: metric index k, team Ti gets ((i + k) % 6) + 1 (k = 0..10 in the order of the columns below)
insert into public.global_team_stats
  (year_id, team_id, tournament_points_scored, championships, finals, final_fours, elite_eights,
   sweet_sixteens, second_rounds, tournament_appearances, upsets_caused, times_upset, picks)
select (select id from fx where name = 'ya'), (select id from fx where name = 'T' || i), ((i + 0) % 6) + 1, ((i + 1) % 6) + 1, ((i + 2) % 6) + 1, ((i + 3) % 6) + 1, ((i + 4) % 6) + 1, ((i + 5) % 6) + 1, ((i + 6) % 6) + 1, ((i + 7) % 6) + 1, ((i + 8) % 6) + 1, ((i + 9) % 6) + 1, ((i + 10) % 6) + 1
from generate_series(0, 5) as i;
insert into public.global_team_stats
  (year_id, team_id, tournament_points_scored, championships, finals, final_fours, elite_eights,
   sweet_sixteens, second_rounds, tournament_appearances, upsets_caused, times_upset, picks)
values ((select id from fx where name = 'yb'), (select id from fx where name = 'TX'),
  1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000);

select tests.authenticate_as_service_role();

select results_eq(
  $$select * from public.get_top_performing_teams_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T5'), 'T5', 'logo-T5', (select id from fx where name = 'Power'), 6::bigint),
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'Mid'), 5::bigint),
    ((select id from fx where name = 'T3'), 'T3', 'logo-T3', (select id from fx where name = 'Power'), 4::bigint),
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'Mid'), 3::bigint),
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'Power'), 2::bigint)$$,
  'get_top_performing_teams_by_year returns top 5 by tournament_points_scored for the year only');

select results_eq(
  $$select * from public.get_teams_with_most_championships_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'Mid'), 6::bigint),
    ((select id from fx where name = 'T3'), 'T3', 'logo-T3', (select id from fx where name = 'Power'), 5::bigint),
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'Mid'), 4::bigint),
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'Power'), 3::bigint),
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'Mid'), 2::bigint)$$,
  'get_teams_with_most_championships_by_year returns top 5 by championships for the year only');

select results_eq(
  $$select * from public.get_teams_with_most_finals_appearances_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T3'), 'T3', 'logo-T3', (select id from fx where name = 'Power'), 6::bigint),
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'Mid'), 5::bigint),
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'Power'), 4::bigint),
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'Mid'), 3::bigint),
    ((select id from fx where name = 'T5'), 'T5', 'logo-T5', (select id from fx where name = 'Power'), 2::bigint)$$,
  'get_teams_with_most_finals_appearances_by_year returns top 5 by finals for the year only');

select results_eq(
  $$select * from public.get_teams_with_most_final_four_appearances_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'Mid'), 6::bigint),
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'Power'), 5::bigint),
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'Mid'), 4::bigint),
    ((select id from fx where name = 'T5'), 'T5', 'logo-T5', (select id from fx where name = 'Power'), 3::bigint),
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'Mid'), 2::bigint)$$,
  'get_teams_with_most_final_four_appearances_by_year returns top 5 by final_fours for the year only');

select results_eq(
  $$select * from public.get_teams_with_most_elite_eight_appearances_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'Power'), 6::bigint),
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'Mid'), 5::bigint),
    ((select id from fx where name = 'T5'), 'T5', 'logo-T5', (select id from fx where name = 'Power'), 4::bigint),
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'Mid'), 3::bigint),
    ((select id from fx where name = 'T3'), 'T3', 'logo-T3', (select id from fx where name = 'Power'), 2::bigint)$$,
  'get_teams_with_most_elite_eight_appearances_by_year returns top 5 by elite_eights for the year only');

select results_eq(
  $$select * from public.get_teams_with_most_sweet_sixteen_appearances_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'Mid'), 6::bigint),
    ((select id from fx where name = 'T5'), 'T5', 'logo-T5', (select id from fx where name = 'Power'), 5::bigint),
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'Mid'), 4::bigint),
    ((select id from fx where name = 'T3'), 'T3', 'logo-T3', (select id from fx where name = 'Power'), 3::bigint),
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'Mid'), 2::bigint)$$,
  'get_teams_with_most_sweet_sixteen_appearances_by_year returns top 5 by sweet_sixteens for the year only');

select results_eq(
  $$select * from public.get_teams_with_most_second_round_appearances_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T5'), 'T5', 'logo-T5', (select id from fx where name = 'Power'), 6::bigint),
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'Mid'), 5::bigint),
    ((select id from fx where name = 'T3'), 'T3', 'logo-T3', (select id from fx where name = 'Power'), 4::bigint),
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'Mid'), 3::bigint),
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'Power'), 2::bigint)$$,
  'get_teams_with_most_second_round_appearances_by_year returns top 5 by second_rounds for the year only');

select results_eq(
  $$select * from public.get_teams_with_most_tournament_appearances_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'Mid'), 6::bigint),
    ((select id from fx where name = 'T3'), 'T3', 'logo-T3', (select id from fx where name = 'Power'), 5::bigint),
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'Mid'), 4::bigint),
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'Power'), 3::bigint),
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'Mid'), 2::bigint)$$,
  'get_teams_with_most_tournament_appearances_by_year returns top 5 by tournament_appearances for the year only');

select results_eq(
  $$select * from public.get_teams_that_caused_most_upsets_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T3'), 'T3', 'logo-T3', (select id from fx where name = 'Power'), 6::bigint),
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'Mid'), 5::bigint),
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'Power'), 4::bigint),
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'Mid'), 3::bigint),
    ((select id from fx where name = 'T5'), 'T5', 'logo-T5', (select id from fx where name = 'Power'), 2::bigint)$$,
  'get_teams_that_caused_most_upsets_by_year returns top 5 by upsets_caused for the year only');

select results_eq(
  $$select * from public.get_most_upset_teams_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'Mid'), 6::bigint),
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'Power'), 5::bigint),
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'Mid'), 4::bigint),
    ((select id from fx where name = 'T5'), 'T5', 'logo-T5', (select id from fx where name = 'Power'), 3::bigint),
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'Mid'), 2::bigint)$$,
  'get_most_upset_teams_by_year returns top 5 by times_upset for the year only');

select results_eq(
  $$select * from public.get_top_picked_teams_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T1'), 'T1', 'logo-T1', (select id from fx where name = 'Power'), 6::bigint),
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'Mid'), 5::bigint),
    ((select id from fx where name = 'T5'), 'T5', 'logo-T5', (select id from fx where name = 'Power'), 4::bigint),
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'Mid'), 3::bigint),
    ((select id from fx where name = 'T3'), 'T3', 'logo-T3', (select id from fx where name = 'Power'), 2::bigint)$$,
  'get_top_picked_teams_by_year returns top 5 by picks for the year only');

select results_eq(
  $$select * from public.get_top_performing_non_power_conference_teams_by_year((select id from fx where name = 'ya'))$$,
  $$values
    ((select id from fx where name = 'T4'), 'T4', 'logo-T4', (select id from fx where name = 'Mid'), 5::bigint),
    ((select id from fx where name = 'T2'), 'T2', 'logo-T2', (select id from fx where name = 'Mid'), 3::bigint),
    ((select id from fx where name = 'T0'), 'T0', 'logo-T0', (select id from fx where name = 'Mid'), 1::bigint)$$,
  'get_top_performing_non_power_conference_teams_by_year returns only Mid teams ordered by points');

select tests.clear_authentication();
select * from finish();
rollback;
