-- Step 9a-1: the server saves a whole bracket (bracket row, 67 games, 63 picks)
-- in one transaction instead of the browser writing three tables in sequence
-- (docs/DIAGNOSIS.md findings 3, 31, 54).
--
-- tournament_games gets bracket_id so each bracket owns its own game rows;
-- persist_bracket validates the payload and inserts everything or nothing.
-- Only service_role may call it.

alter table public.tournament_games
  add column bracket_id uuid references public.user_brackets (id) on delete cascade;

create index tournament_games_bracket_id_idx on public.tournament_games (bracket_id);

-- Links legacy games (bracket_id null) to their bracket. A picked game takes its
-- pick's bracket. The old app never picked play-in games, but it saved all of a
-- bracket's games one request at a time within ~2s, and no two brackets' saves
-- overlapped (checked on the hosted DB on 2026-11-19). So an unpicked game takes
-- the one bracket of its year whose games were saved within 5s of it; a game
-- near no bracket, or near more than one, stays null. Idempotent: 9a-2 calls it
-- again for brackets the old app saves before that deploy. Returns rows updated.
create function public.backfill_tournament_game_brackets() returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_picked bigint;
  v_unpicked bigint;
begin
  update public.tournament_games g
  set bracket_id = p.bracket_id
  from public.user_picks p
  where p.game_id = g.id and g.bracket_id is null;
  get diagnostics v_picked = row_count;

  with saved as (
    select bracket_id, year_id, min(created_at) as first_at, max(created_at) as last_at
    from public.tournament_games
    where bracket_id is not null
    group by bracket_id, year_id
  ), matched as (
    select g.id, (array_agg(s.bracket_id))[1] as bracket_id
    from public.tournament_games g
    join saved s
      on s.year_id = g.year_id
     and g.created_at between s.first_at - interval '5 seconds' and s.last_at + interval '5 seconds'
    where g.bracket_id is null
    group by g.id
    having count(*) = 1
  )
  update public.tournament_games g
  set bracket_id = m.bracket_id
  from matched m
  where g.id = m.id;
  get diagnostics v_unpicked = row_count;

  return v_picked + v_unpicked;
end;
$$;

revoke execute on function public.backfill_tournament_game_brackets() from public, anon, authenticated, service_role;

select public.backfill_tournament_game_brackets();

create or replace function public.persist_bracket(payload jsonb) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_bracket jsonb := payload -> 'bracket';
  v_games jsonb := payload -> 'games';
  v_year_id uuid := (v_bracket ->> 'year_id')::uuid;
  v_user_id uuid := (v_bracket ->> 'user_id')::uuid;
  v_anon_id uuid := (v_bracket ->> 'anon_user_id')::uuid;
  v_rules_id uuid := (v_bracket ->> 'tournament_scoring_rules_id')::uuid;
  v_score int := (v_bracket ->> 'score')::int;
  v_bracket_id uuid;
begin
  if (v_user_id is null) = (v_anon_id is null) then
    raise exception 'persist_bracket: exactly one of user_id and anon_user_id is required'
      using errcode = '22023';
  end if;

  if v_year_id is null then
    raise exception 'persist_bracket: year_id is required'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.tournament_scoring_rules r
    where r.id = v_rules_id and r.year_id = v_year_id
  ) then
    raise exception 'persist_bracket: scoring rules do not belong to the bracket year'
      using errcode = '22023';
  end if;

  -- Separate ifs so jsonb_array_length only ever sees an array.
  if jsonb_typeof(v_games) is distinct from 'array' then
    raise exception 'persist_bracket: expected exactly 67 games'
      using errcode = '22023';
  end if;
  if jsonb_array_length(v_games) <> 67 then
    raise exception 'persist_bracket: expected exactly 67 games'
      using errcode = '22023';
  end if;

  if (select count(*) from jsonb_array_elements(v_games) g
      where coalesce((g ->> 'is_play_in')::boolean, false)) <> 4
     or exists (select 1 from jsonb_array_elements(v_games) g
                where coalesce((g ->> 'is_play_in')::boolean, false)
                  and jsonb_typeof(g -> 'pick') = 'object') then
    raise exception 'persist_bracket: expected exactly 4 play-in games, none with a pick'
      using errcode = '22023';
  end if;

  if (select count(*) from jsonb_array_elements(v_games) g
      where jsonb_typeof(g -> 'pick') = 'object') <> 63 then
    raise exception 'persist_bracket: expected exactly 63 picks'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_games) g
    cross join lateral (values
      (g ->> 'favored_team_id'), (g ->> 'underdog_team_id'),
      (g ->> 'winning_team_id'), (g -> 'pick' ->> 'picked_team_id')
    ) as t (team_id)
    where t.team_id is not null
      and not exists (
        select 1 from public.teams tm
        where tm.id = t.team_id::uuid and tm.year_id = v_year_id
      )
  ) or exists (
    select 1 from jsonb_array_elements(v_games) g
    where g ->> 'favored_team_id' is null
       or g ->> 'underdog_team_id' is null
       or g ->> 'winning_team_id' is null
       or (jsonb_typeof(g -> 'pick') = 'object' and g -> 'pick' ->> 'picked_team_id' is null)
  ) then
    raise exception 'persist_bracket: every team must be a team of the bracket year'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_games) g
    where (g ->> 'favored_team_id')::uuid = (g ->> 'underdog_team_id')::uuid
  ) then
    raise exception 'persist_bracket: a game needs two different teams'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_games) g
    where (g ->> 'winning_team_id')::uuid
          not in ((g ->> 'favored_team_id')::uuid, (g ->> 'underdog_team_id')::uuid)
  ) then
    raise exception 'persist_bracket: a winner must be one of the two teams in the game'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_games) g
    where g ->> 'favored_team_seed' is null or g ->> 'underdog_team_seed' is null
       or g ->> 'favored_team_score' is null or g ->> 'underdog_team_score' is null
       or not exists (select 1 from public.rounds r where r.id = (g ->> 'round_id')::uuid)
  ) then
    raise exception 'persist_bracket: every game needs a round, both seeds and both scores'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_games) g
    where jsonb_typeof(g -> 'pick') = 'object' and g -> 'pick' ->> 'picked_team_seed' is null
  ) then
    raise exception 'persist_bracket: every pick needs a team and a seed'
      using errcode = '22023';
  end if;

  if v_score is null then
    raise exception 'persist_bracket: score is required'
      using errcode = '22023';
  end if;

  if v_score < 0 then
    raise exception 'persist_bracket: score must be at least 0'
      using errcode = '22023';
  end if;

  insert into public.user_brackets (user_id, anon_user_id, year_id, tournament_scoring_rules_id, score)
  values (v_user_id, v_anon_id, v_year_id, v_rules_id, v_score)
  returning id into v_bracket_id;

  -- Game ids are assigned up front so each pick finds its game by position.
  with g as (
    select e.ord, gen_random_uuid() as game_id, e.j
    from jsonb_array_elements(v_games) with ordinality as e (j, ord)
  ), ins_games as (
    insert into public.tournament_games
      (id, year_id, bracket_id, round_id, is_play_in,
       favored_team_id, favored_team_seed, favored_team_score,
       underdog_team_id, underdog_team_seed, underdog_team_score, winning_team_id)
    select g.game_id, v_year_id, v_bracket_id, (g.j ->> 'round_id')::uuid,
           coalesce((g.j ->> 'is_play_in')::boolean, false),
           (g.j ->> 'favored_team_id')::uuid, (g.j ->> 'favored_team_seed')::int, (g.j ->> 'favored_team_score')::int,
           (g.j ->> 'underdog_team_id')::uuid, (g.j ->> 'underdog_team_seed')::int, (g.j ->> 'underdog_team_score')::int,
           (g.j ->> 'winning_team_id')::uuid
    from g
    returning id
  )
  insert into public.user_picks (bracket_id, game_id, picked_team_id, picked_team_seed)
  select v_bracket_id, g.game_id,
         (g.j -> 'pick' ->> 'picked_team_id')::uuid, (g.j -> 'pick' ->> 'picked_team_seed')::int
  from g
  where jsonb_typeof(g.j -> 'pick') = 'object'
  order by g.ord;

  return v_bracket_id;
end;
$$;

revoke execute on function public.persist_bracket(jsonb) from public, anon, authenticated;
grant execute on function public.persist_bracket(jsonb) to service_role;
