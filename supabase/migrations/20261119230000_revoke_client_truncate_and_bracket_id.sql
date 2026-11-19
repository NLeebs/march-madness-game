-- Client roles lose two privileges they never use (no client code reads or
-- writes these tables; the server uses service_role).
--
-- TRUNCATE: the baseline's GRANT ALL gave anon and authenticated TRUNCATE on
-- every public table, and TRUNCATE skips RLS. 20261119202903 removed it from
-- user_brackets and user_picks; this removes it everywhere, and from tables
-- created later.
revoke truncate on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate on tables from anon, authenticated;

-- tournament_games.bracket_id (20261119202448) would let anyone group every
-- bracket's games. Clients keep SELECT on every other column. A column added
-- later gets no client SELECT unless granted here.
revoke select on public.tournament_games from anon, authenticated;
grant select (id, year_id, round_id, is_play_in,
              favored_team_id, favored_team_seed, favored_team_score,
              underdog_team_id, underdog_team_seed, underdog_team_score,
              winning_team_id, created_at)
  on public.tournament_games to anon, authenticated;
