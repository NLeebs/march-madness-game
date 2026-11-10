-- Replaces the calculate_user_total_stats Edge Function. Returns false (without
-- writing) when inputs are unchanged since the last refresh, otherwise rebuilds
-- user_total_stats (one row per non-anonymous user and year with brackets) and
-- returns true. Averages use the newest brackets first; ranks are per year.
-- Rows whose values did not change are not rewritten. p_fp: see
-- stats.refresh_user_bracket_stats.
create function stats.refresh_user_total_stats(p_fp jsonb default null) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v_fp jsonb := coalesce(p_fp, stats.inputs_fingerprint());
begin
  if not stats.inputs_changed('user_total_stats', v_fp) then
    return false;
  end if;

  with brackets as (
    select b.id, b.user_id, b.year_id, b.score, b.created_at,
           row_number() over (partition by b.user_id, b.year_id
                              order by b.created_at desc nulls last, b.id desc) as recency
    from public.user_brackets b
    where b.user_id is not null
  ),
  totals as (
    select user_id, year_id,
           count(*) as total_brackets,
           max(score) as high_score,
           min(score) as low_score,
           case when count(*) >= 5 then round(avg(score)) end as average_score,
           case when count(*) >= 5 then round(avg(score) filter (where recency <= 3)) else 0 end
             as last_three_average_score,
           case when count(*) >= 10 then round(avg(score) filter (where recency <= 10)) else 0 end
             as last_ten_average_score
    from brackets
    group by user_id, year_id
  ),
  resolved as (
    select b.user_id, b.year_id, b.created_at as bracket_created_at,
           p.picked_team_id, p.created_at as pick_created_at,
           t.conference_id,
           r.round_name,
           (p.picked_team_id = g.winning_team_id) is true as is_correct,
           (r.round_name = '1' and g.is_play_in is not true) as is_round_one,
           stats.is_first_round_upset_pick(g.is_play_in, r.round_name, g.favored_team_seed,
                                           g.underdog_team_seed, p.picked_team_seed) as is_upset_pick
    from public.user_picks p
    join brackets b on b.id = p.bracket_id
    join public.tournament_games g on g.id = p.game_id
    join public.rounds r on r.id = g.round_id
    left join public.teams t on t.id = p.picked_team_id
    where g.winning_team_id is not null
  ),
  pick_agg as (
    select user_id, year_id,
           count(*) as total_picks,
           count(*) filter (where is_correct) as total_correct_picks,
           count(*) filter (where is_round_one) as total_round_ones_picked,
           count(*) filter (where is_round_one and is_correct) as round_ones_correct,
           count(*) filter (where round_name = '2') as total_round_twos_picked,
           count(*) filter (where round_name = '2' and is_correct) as round_twos_correct,
           count(*) filter (where round_name = 'sweet sixteen') as total_sweet_sixteens_picked,
           count(*) filter (where round_name = 'sweet sixteen' and is_correct) as sweet_sixteens_correct,
           count(*) filter (where round_name = 'elite eight') as total_elite_eights_picked,
           count(*) filter (where round_name = 'elite eight' and is_correct) as elite_eights_correct,
           count(*) filter (where round_name = 'final four') as total_final_fours_picked,
           count(*) filter (where round_name = 'final four' and is_correct) as final_fours_correct,
           count(*) filter (where round_name = 'finals') as total_champions_picked,
           count(*) filter (where round_name = 'finals' and is_correct) as champions_correct,
           count(*) filter (where is_upset_pick) as upsets_picked,
           count(*) filter (where is_upset_pick and is_correct) as upsets_correct
    from resolved
    group by user_id, year_id
  ),
  top_champion as (
    select distinct on (user_id, year_id)
           user_id, year_id, picked_team_id as team_id, count(*) as picks
    from resolved
    where round_name = 'finals' and picked_team_id is not null
    group by user_id, year_id, picked_team_id
    order by user_id, year_id, count(*) desc,
             max(pick_created_at) desc nulls last,
             max(bracket_created_at) desc nulls last,
             picked_team_id asc
  ),
  top_conference as (
    select distinct on (user_id, year_id)
           user_id, year_id, conference_id, count(*) as picks
    from resolved
    where conference_id is not null
    group by user_id, year_id, conference_id
    order by user_id, year_id, count(*) desc,
             max(pick_created_at) desc nulls last,
             max(bracket_created_at) desc nulls last,
             conference_id asc
  ),
  combined as (
    select t.*,
           coalesce(a.total_picks, 0) as total_picks,
           coalesce(a.total_correct_picks, 0) as total_correct_picks,
           coalesce(a.total_round_ones_picked, 0) as total_round_ones_picked,
           coalesce(a.round_ones_correct, 0) as round_ones_correct,
           coalesce(a.total_round_twos_picked, 0) as total_round_twos_picked,
           coalesce(a.round_twos_correct, 0) as round_twos_correct,
           coalesce(a.total_sweet_sixteens_picked, 0) as total_sweet_sixteens_picked,
           coalesce(a.sweet_sixteens_correct, 0) as sweet_sixteens_correct,
           coalesce(a.total_elite_eights_picked, 0) as total_elite_eights_picked,
           coalesce(a.elite_eights_correct, 0) as elite_eights_correct,
           coalesce(a.total_final_fours_picked, 0) as total_final_fours_picked,
           coalesce(a.final_fours_correct, 0) as final_fours_correct,
           coalesce(a.total_champions_picked, 0) as total_champions_picked,
           coalesce(a.champions_correct, 0) as champions_correct,
           coalesce(a.upsets_picked, 0) as upsets_picked,
           coalesce(a.upsets_correct, 0) as upsets_correct,
           tc.team_id as top_picked_champion_id,
           tc.picks as total_top_picked_champion_picks,
           tf.conference_id as top_picked_conference_id,
           tf.picks as total_top_picked_conference_picks
    from totals t
    left join pick_agg a on a.user_id = t.user_id and a.year_id = t.year_id
    left join top_champion tc on tc.user_id = t.user_id and tc.year_id = t.year_id
    left join top_conference tf on tf.user_id = t.user_id and tf.year_id = t.year_id
  ),
  ranked as (
    select c.*,
           rank() over (partition by year_id order by high_score desc) as high_score_rank,
           case when average_score is not null
                then rank() over (partition by year_id order by average_score desc nulls last)
           end as average_score_rank,
           rank() over (partition by year_id order by champions_correct desc) as champions_rank
    from combined c
  )
  insert into public.user_total_stats as s
    (user_id, year_id, total_brackets, high_score, high_score_rank, low_score,
     average_score, average_score_rank, last_three_average_score, last_ten_average_score,
     total_picks, total_correct_picks, correct_pick_percentage,
     total_round_ones_picked, rounds_ones_guessed_correctly, round_one_correct_percentage,
     total_round_twos_picked, round_twos_guessed_correctly, round_two_correct_percentage,
     total_sweet_sixteens_picked, sweet_sixteens_guessed_correctly, sweet_sixteen_correct_percentage,
     total_elite_eights_picked, elite_eights_guessed_correctly, elite_eight_correct_percentage,
     total_final_fours_picked, final_fours_guessed_correctly, final_four_correct_percentage,
     champions_guessed_correctly, champions_guessed_correctly_rank, champion_correct_percentage,
     total_first_round_upsets_picked, total_first_round_upsets_correct,
     first_round_upsets_correct_percentage,
     top_picked_champion_id, total_top_picked_champion_picks,
     top_picked_conference_id, total_top_picked_conference_picks)
  select user_id, year_id, total_brackets, high_score, high_score_rank, low_score,
         coalesce(average_score, 0), average_score_rank,
         last_three_average_score, last_ten_average_score,
         total_picks, total_correct_picks,
         case when total_picks = 0 then 0
              else round(100.0 * total_correct_picks / total_picks, 1) end,
         total_round_ones_picked, round_ones_correct,
         case when total_round_ones_picked = 0 then 0
              else round(100.0 * round_ones_correct / total_round_ones_picked, 1) end,
         total_round_twos_picked, round_twos_correct,
         case when total_round_twos_picked = 0 then 0
              else round(100.0 * round_twos_correct / total_round_twos_picked, 1) end,
         total_sweet_sixteens_picked, sweet_sixteens_correct,
         case when total_sweet_sixteens_picked = 0 then 0
              else round(100.0 * sweet_sixteens_correct / total_sweet_sixteens_picked, 1) end,
         total_elite_eights_picked, elite_eights_correct,
         case when total_elite_eights_picked = 0 then 0
              else round(100.0 * elite_eights_correct / total_elite_eights_picked, 1) end,
         total_final_fours_picked, final_fours_correct,
         case when total_final_fours_picked = 0 then 0
              else round(100.0 * final_fours_correct / total_final_fours_picked, 1) end,
         champions_correct, champions_rank,
         case when total_champions_picked = 0 then 0
              else round(100.0 * champions_correct / total_champions_picked, 1) end,
         upsets_picked, upsets_correct,
         case when upsets_picked = 0 then 0
              else round(100.0 * upsets_correct / upsets_picked, 1) end,
         top_picked_champion_id, total_top_picked_champion_picks,
         top_picked_conference_id, total_top_picked_conference_picks
  from ranked
  on conflict (user_id, year_id) do update set
    total_brackets = excluded.total_brackets,
    high_score = excluded.high_score,
    high_score_rank = excluded.high_score_rank,
    low_score = excluded.low_score,
    average_score = excluded.average_score,
    average_score_rank = excluded.average_score_rank,
    last_three_average_score = excluded.last_three_average_score,
    last_ten_average_score = excluded.last_ten_average_score,
    total_picks = excluded.total_picks,
    total_correct_picks = excluded.total_correct_picks,
    correct_pick_percentage = excluded.correct_pick_percentage,
    total_round_ones_picked = excluded.total_round_ones_picked,
    rounds_ones_guessed_correctly = excluded.rounds_ones_guessed_correctly,
    round_one_correct_percentage = excluded.round_one_correct_percentage,
    total_round_twos_picked = excluded.total_round_twos_picked,
    round_twos_guessed_correctly = excluded.round_twos_guessed_correctly,
    round_two_correct_percentage = excluded.round_two_correct_percentage,
    total_sweet_sixteens_picked = excluded.total_sweet_sixteens_picked,
    sweet_sixteens_guessed_correctly = excluded.sweet_sixteens_guessed_correctly,
    sweet_sixteen_correct_percentage = excluded.sweet_sixteen_correct_percentage,
    total_elite_eights_picked = excluded.total_elite_eights_picked,
    elite_eights_guessed_correctly = excluded.elite_eights_guessed_correctly,
    elite_eight_correct_percentage = excluded.elite_eight_correct_percentage,
    total_final_fours_picked = excluded.total_final_fours_picked,
    final_fours_guessed_correctly = excluded.final_fours_guessed_correctly,
    final_four_correct_percentage = excluded.final_four_correct_percentage,
    champions_guessed_correctly = excluded.champions_guessed_correctly,
    champions_guessed_correctly_rank = excluded.champions_guessed_correctly_rank,
    champion_correct_percentage = excluded.champion_correct_percentage,
    total_first_round_upsets_picked = excluded.total_first_round_upsets_picked,
    total_first_round_upsets_correct = excluded.total_first_round_upsets_correct,
    first_round_upsets_correct_percentage = excluded.first_round_upsets_correct_percentage,
    top_picked_champion_id = excluded.top_picked_champion_id,
    total_top_picked_champion_picks = excluded.total_top_picked_champion_picks,
    top_picked_conference_id = excluded.top_picked_conference_id,
    total_top_picked_conference_picks = excluded.total_top_picked_conference_picks
  -- skip rows whose stat columns are unchanged (keys and timestamps excluded)
  where to_jsonb(s) - '{id,user_id,year_id,created_at,updated_at}'::text[]
        is distinct from
        to_jsonb(excluded) - '{id,user_id,year_id,created_at,updated_at}'::text[];

  delete from public.user_total_stats s
  where not exists (
    select 1 from public.user_brackets b
    where b.user_id = s.user_id and b.year_id = s.year_id);

  perform stats.record_refresh('user_total_stats', v_fp);
  return true;
end $$;

revoke execute on function stats.refresh_user_total_stats(jsonb)
  from public, anon, authenticated, service_role;
