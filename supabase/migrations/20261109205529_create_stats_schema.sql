-- Private schema for stats refresh jobs run by pg_cron. Not exposed through
-- the API: no role other than the owner (and superusers) can use it.
create schema if not exists stats;

revoke all on schema stats from public, anon, authenticated, service_role;
-- Note: PUBLIC gets EXECUTE on every new function by a global default that a
-- per-schema "alter default privileges ... revoke" cannot remove. Every stats.*
-- function therefore needs its own explicit REVOKE;
-- supabase/tests/database/19_stats_cron_and_privileges.test.sql fails if one is missing.

-- One row per job: the input fingerprint seen at its last successful refresh.
create table stats.refresh_log (
  job text primary key,
  fingerprint jsonb not null,
  refreshed_at timestamptz not null
);
revoke all on table stats.refresh_log from public, anon, authenticated, service_role;

-- Fingerprint of everything the per-user stats read. Each part is a row count
-- plus a sum of hashes of (id, xmin, ctid). Every insert, delete and update
-- changes the sum, including backdated created_at values that a count plus
-- max(created_at) misses: an update writes a new row version, which gets a new
-- ctid (even within one transaction) and a new xmin (in a later transaction,
-- which also covers a slot being reused). VACUUM FULL or CLUSTER move rows and
-- only cause one extra refresh. Anonymous brackets (and their picks
-- and games) are left out because they never affect per-user stats. teams is
-- included for top_picked_conference_id; rounds is static and left out.
create function stats.inputs_fingerprint() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'brackets', (
      select jsonb_build_array(
        count(*),
        coalesce(sum(pg_catalog.hashtextextended(
          b.id::text || ':' || b.xmin::text || ':' || b.ctid::text, 0)), 0))
      from public.user_brackets b
      where b.user_id is not null),
    'picks', (
      select jsonb_build_array(
        count(*),
        coalesce(sum(pg_catalog.hashtextextended(
          p.id::text || ':' || p.xmin::text || ':' || p.ctid::text, 0)), 0),
        coalesce(sum(pg_catalog.hashtextextended(
          g.id::text || ':' || g.xmin::text || ':' || g.ctid::text, 0)), 0))
      from public.user_picks p
      join public.user_brackets b on b.id = p.bracket_id
      join public.tournament_games g on g.id = p.game_id
      where b.user_id is not null),
    'teams', (
      select jsonb_build_array(
        count(*),
        coalesce(sum(pg_catalog.hashtextextended(
          t.id::text || ':' || t.xmin::text || ':' || t.ctid::text, 0)), 0))
      from public.teams t)
  );
$$;

create function stats.inputs_changed(p_job text, p_fingerprint jsonb) returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce(
    (select l.fingerprint is distinct from p_fingerprint
       from stats.refresh_log l where l.job = p_job),
    true);
$$;

create function stats.record_refresh(p_job text, p_fingerprint jsonb) returns void
language sql security invoker set search_path = '' as $$
  insert into stats.refresh_log (job, fingerprint, refreshed_at)
  values (p_job, p_fingerprint, clock_timestamp())
  on conflict (job) do update
    set fingerprint = excluded.fingerprint, refreshed_at = excluded.refreshed_at;
$$;

-- The one definition of a first-round upset pick, shared by user_bracket_stats
-- and user_total_stats. No SET search_path so the planner can inline it into
-- the refresh queries; it only uses built-in operators, which resolve from
-- pg_catalog regardless of search_path.
create function stats.is_first_round_upset_pick(
  p_is_play_in boolean, p_round_name text,
  p_favored_seed int, p_underdog_seed int, p_picked_seed int) returns boolean
language sql immutable parallel safe as $$
  select p_is_play_in is not true
     and p_round_name = '1'
     and p_favored_seed <> p_underdog_seed
     and p_picked_seed = greatest(p_favored_seed, p_underdog_seed);
$$;

revoke execute on all functions in schema stats from public, anon, authenticated, service_role;
