-- Step 9a-2: the server now saves brackets through persist_bracket, which sets
-- tournament_games.bracket_id. Brackets the old app saved between the 9a-1
-- migration and this deploy have bracket_id null on all their games, so re-run
-- the idempotent backfill from 20261119202448. A bracket saved in the seconds
-- between this migration and the Vercel deploy can still be missed; the same
-- statement can be re-run by hand.
select public.backfill_tournament_game_brackets();
