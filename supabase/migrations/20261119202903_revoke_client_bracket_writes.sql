-- The server (service_role, which bypasses grants and RLS) is the only writer
-- of public.user_brackets and public.user_picks (findings 25, 26). Clients keep
-- SELECT on their own rows. Deletes are blocked as well, by the owner's decision.
--
-- GRANT ALL in the baseline also gave anon/authenticated TRUNCATE, which
-- bypasses RLS, so it is revoked too. REFERENCES and TRIGGER are left alone.

-- Column-level grants from 20261109143058 / 20261109145257. A table-level
-- revoke below also removes them; they are listed to document the intent.
revoke insert (id, user_id, year_id, tournament_scoring_rules_id, created_at, anon_user_id)
  on public.user_brackets from anon, authenticated;
revoke update (tournament_scoring_rules_id)
  on public.user_brackets from authenticated;

revoke insert, update, delete, truncate
  on public.user_brackets, public.user_picks
  from anon, authenticated;

-- With no client write privilege these policies can never apply. Drop them so
-- a stray future grant cannot reopen client writes. Select policies stay.
drop policy "user_brackets_insert_anon" on public.user_brackets;
drop policy "user_brackets_insert_authenticated" on public.user_brackets;
drop policy "user_brackets_update_authenticated" on public.user_brackets;
drop policy "user_brackets_delete_authenticated" on public.user_brackets;
drop policy "user_picks_insert_authenticated" on public.user_picks;
drop policy "user_picks_update_own" on public.user_picks;
drop policy "user_picks_delete_own" on public.user_picks;
