# Step 9 cleanup: preview play-testing and 9a-2 leftovers

Approved 2026-11-23. Small change; one PR off `main`.

## Why

After step 9b the server plays the whole game, and `/api/season` and `/api/bracket/simulation` reject any origin not on the allow-list. Only `madnessgame.app` is listed, so a Vercel preview (or a build's own deployment link) crashes on Start with `400 INVALID_ORIGIN`. The owner wants to play a branch on its preview before merging. Separately, four leftovers from 9a-2 were left open.

## Goals

- A preview deployment can play a full game.
- Preview games don't land in production stats. Previews use the production database (decided: a separate Supabase project or branching costs money or upkeep, and with ~55 saved brackets each test game is ~2% of the pick data).
- The origin check matches exact origins (today `startsWith` would let `https://madnessgame.app.evil.com` through when the allowed URL has no trailing slash).
- Clear the 9a-2 leftovers.

Non-goals: a separate preview database; tagging preview brackets so stats skip them; excluding production smoke tests from stats.

## Approaches considered (preview saves)

1. **Picked: previews play everything but skip the save.** One `VERCEL_ENV` check; stats stay clean. Cost: a preview never exercises `persist_bracket` (covered by pgTAP and by the production smoke test after merge).
2. Save with a preview flag that stats skip: migration, every stats refresh changes, more pgTAP. Too much for the gain.
3. Save normally: test brackets skew pick stats while the dataset is small.

For origins, there is one sensible way: Vercel sets `VERCEL_URL` (the deployment's own host) and `VERCEL_BRANCH_URL` (the branch alias) on every deployment, so the server accepts its own addresses. A fixed `NEXT_PUBLIC_STAGING_URL` can't cover per-branch previews.

## Design

- **Allowed origins** (`utils/api/allowedOrigins.ts`): add `https://${VERCEL_URL}` and `https://${VERCEL_BRANCH_URL}` when set (any environment; accepting a production build's own link is harmless). Normalize every entry to a URL origin (drop trailing slash/path).
- **Origin check** (`validateOrigin`): the `Origin` header must equal an allowed origin exactly (no `startsWith`); the referer fallback compares origins exactly too (not bare hostname, so `http://` and other ports don't pass). Localhost in development stays as is.
- **Preview saves** (`playTournament`): when `VERCEL_ENV === "preview"`, validate, play and score as today, skip `persistBracket`, return `bracketId: null`. `PlayTournamentResult.bracketId` becomes `string | null`. The browser never reads `bracketId`.
- **`NEXT_PUBLIC_APP_MODE`**: remove from `.env`, `.env.local`, `e2e/support/env.ts`, the guard in `tests/game/picksAndScoring.test.ts` and the stub in `tests/unit/store/tournamentPlayersPicksSlice.test.ts`; update CLAUDE.md.
- **Round names**: one shared map from `rounds.round_name` to round, used by `PlayTournament.ts` and `TournamentRepository.ts` (which needs only the scored rounds).
- **Tournament request/response types**: move `SimulationRequestBody`'s client shape and `PlayTournamentResult` into `types/`, so `src/utils/playTournamentPost.ts` imports neither `app/` nor `application/`.
- **`getSessionUserId`**: no change. It already falls back to the anon id and reports auth outages; the remaining crash (signed in + storage blocked + Auth down at once) is accepted. Record in DIAGNOSIS.

## Left to the builder

Where the shared round map lives; exact names of moved types; test layout. Every change starts with a failing test. If `VERCEL_URL`/`VERCEL_BRANCH_URL` are missing at runtime on the first preview, enable "Automatically expose System Environment Variables" in the Vercel project.
