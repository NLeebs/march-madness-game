-- One entry point for the 30-minute per-user stats job: computes the input
-- fingerprint once (instead of once per job) and runs the two refreshes one
-- after the other, so they do not compete for the same tables.
create function stats.refresh_user_stats() returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_fp jsonb := stats.inputs_fingerprint();
begin
  perform stats.refresh_user_bracket_stats(v_fp);
  perform stats.refresh_user_total_stats(v_fp);
end $$;

revoke execute on function stats.refresh_user_stats()
  from public, anon, authenticated, service_role;
