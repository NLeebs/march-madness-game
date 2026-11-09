-- Clients must not set or change user_brackets.score; only service_role
-- (which bypasses these grants) writes it. Column-level privileges are used
-- instead of a trigger so no code runs per row.
--
-- NOTE: new columns on public.user_brackets need an explicit column grant
-- below before clients can write them.
revoke insert, update on public.user_brackets from anon, authenticated;

grant insert (id, user_id, year_id, tournament_scoring_rules_id, created_at, anon_user_id)
  on public.user_brackets to anon, authenticated;

grant update (year_id, tournament_scoring_rules_id, anon_user_id)
  on public.user_brackets to authenticated;
