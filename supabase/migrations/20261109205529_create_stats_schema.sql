-- Private schema for stats refresh jobs run by pg_cron. Not exposed through
-- the API: no role other than the owner (and superusers) can use it.
create schema if not exists stats;

revoke all on schema stats from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema stats
  revoke execute on functions from public, anon, authenticated, service_role;

-- One row per job: the input fingerprint seen at its last successful refresh.
create table stats.refresh_log (
  job text primary key,
  fingerprint jsonb not null,
  refreshed_at timestamptz not null
);
revoke all on table stats.refresh_log from public, anon, authenticated, service_role;

create function stats.inputs_fingerprint() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'brackets', (select count(*) from public.user_brackets),
    'brackets_max_created', (select max(created_at) from public.user_brackets),
    'games', (select count(*) from public.tournament_games),
    'games_max_created', (select max(created_at) from public.tournament_games),
    'picks', (select count(*) from public.user_picks),
    'picks_max_created', (select max(created_at) from public.user_picks)
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

revoke execute on all functions in schema stats from public, anon, authenticated, service_role;
