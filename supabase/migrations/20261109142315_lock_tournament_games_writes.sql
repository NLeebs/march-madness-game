-- Only service_role (server-side repositories) may write tournament_games.
-- Baseline had an INSERT policy WITH CHECK (true) plus GRANT ALL to anon/authenticated.
drop policy "tournament_games_insert_authenticated" on public.tournament_games;

revoke insert, update, delete, truncate on public.tournament_games from anon, authenticated;
