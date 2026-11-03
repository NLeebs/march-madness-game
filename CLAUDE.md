# March Madness Game

A Next.js 14 (App Router) game: simulate a college basketball regular season, seed a 68-team tournament, let the player make bracket picks, simulate the tournament, and score the bracket. Results persist to Supabase and feed stats dashboards. Deployed to Vercel on every push to `main`.

See `docs/DIAGNOSIS.md` for the current health assessment and improvement roadmap.

## Commands

```bash
npm run dev            # local dev server (needs .env.local, see below)
npm run build          # production build (also generates next-env.d.ts)
npm run lint           # next lint (eslint next/core-web-vitals)
npm test               # vitest in watch mode
npx vitest run         # single run - use this from Claude / CI
npx vitest run tests/unit/useCases/team/getTeamById.test.ts   # one file
npx tsc --noEmit       # type-check (2 CSS-module errors are expected until next-env.d.ts exists; run `npm run build` once)
```

Always use `npx vitest` / `npx tsc` *after* `npm ci` - if `node_modules` is missing, `npx tsc` silently installs an unrelated package named `tsc`.

## Environment

`.env.local` (gitignored) needs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only - never import `supabaseServiceRole.ts` from client code), `NEXT_PUBLIC_APP_URL`, optional `NEXT_PUBLIC_STAGING_URL`, `NEXT_PUBLIC_APP_MODE=dev` (pre-fills picks), and `NEXT_PUBLIC_FIREBASE_*` (legacy team-stats source only). Tests stub Supabase env vars in `src/test-setup.ts` and never hit a real database.

## Architecture

Layered, roughly clean-architecture. Dependencies point downward only:

```
app/                 Next.js routes. app/page.tsx = the game. app/(private)/ = auth-gated pages. app/api/** = route handlers.
  -> application/    useCases/<domain>/<Verb><Noun>.ts (one exported fn per file, re-exported from index.ts) + mappers/
    -> infrastructure/db/   <Domain>Repository classes wrapping Supabase queries/RPCs
      -> models/     DB row shapes (models/appStatsData/*Supabase.ts) and team-stat shapes
types/               Game/domain types (tournament, regular season). tsconfig maps bare imports "*" -> types/*
store/               Redux Toolkit slices for the in-browser game state machine
src/components/      React UI, grouped by game phase (RegularSeason, Tournament, Dashboard, General, UI)
src/hooks/           TanStack Query hooks (one per API endpoint) + form/auth hooks
src/functions/       Pure-ish game logic: playGame.ts (possession sim engine), seeding, regular season helpers
utils/               Server-side: errorHandling/ (AppError hierarchy, handleApiError, middleware), api/ (auth, origins), supabase/
```

Import alias `@/` = repo root (e.g. `@/src/components`, `@/store`, `@/application/useCases`).

### Two kinds of state
- **Game state** lives in Redux (`store/`). The game is a client-side state machine driven by boolean flags in `appStateSlice` (`startScreen -> regularSeason -> selectionSunday -> tournament -> ... -> tournamentRecap`). `App.tsx` renders phases off those flags.
- **Server data** (years, stats, dashboards) goes through TanStack Query hooks in `src/hooks/` that `fetch('/api/...')`. Query keys are `[camelCaseName, ...params]`.

### Adding an API endpoint (follow the existing pattern)
1. Repository method in `infrastructure/db/<Domain>Repository.ts` - throw `new Error("Failed to ...: " + error.message)` on Supabase error.
2. Use case `application/useCases/<domain>/Get<Thing>.ts`, export from the domain `index.ts`.
3. Route `app/api/<path>/[param]/route.ts`: `try { ... return NextResponse.json(data, {status: 200}) } catch (e) { return handleApiError(e, "<path>") }`. Call `authorizeUserAccess(userId)` for any user-scoped route.
4. Hook `src/hooks/use<Thing>.ts` with `useQuery`, `enabled: !!param`, throw `AppError` on `!response.ok`.
5. Tests: unit test for the use case (mock the repository with `vi.mock`) in `tests/unit/useCases/<domain>/`, integration test for the route (mock the use case) in `tests/integration/`. Build fixtures with `tests/factories/` (`buildX(overrides)`).

Note: `README-API-Error-Handling.md` documents an `apiHandler` wrapper, but no route uses it - routes use explicit try/catch + `handleApiError`. Follow the routes.

### Persisting a bracket
`TournamentPersist` -> `usePersistTournament` -> `POST /api/bracket/simulation` (zod-validated, origin-checked, rate-limited) -> `persistTournament` use case -> `mapTournamentToRows` -> `TournamentRepository` (inserts `user_brackets`, then `tournament_games` + `user_picks`). Logged-out players get an `anon_user_id` from `src/utils/getAnonUserId.ts`.

## Database (Supabase / Postgres)

Baseline schema (tables, RPC functions, RLS policies, grants) is in `supabase/migrations/20261103195820_remote_schema.sql`, dumped from the hosted project - keep it an exact mirror; put changes in new migrations. Tables: `years`, `teams`, `conferences`, `rounds`, `tournament_scoring_rules`, `tournament_round_scoring`, `user_brackets`, `tournament_games`, `user_picks`, `user_bracket_stats`, `user_total_stats`, `global_team_stats`, `global_conference_stats`, `seed_matchup_stats`, `profiles`. Most dashboard stats come from Postgres RPC functions (`get_top_performing_teams_by_year`, `get_top_picked_teams_by_year`, etc.) called via `supabase.rpc(...)`. All repositories currently use the **service-role** client (bypasses RLS); the cookie-based `supabaseServer` client is used only to verify the logged-in user.

Never run writes, migrations, or destructive SQL against the hosted project without explicit confirmation. Claude's Supabase MCP server (`.mcp.json`) is read-only. To refresh the schema snapshot use `npx supabase db dump --remote=<ref> -p "$SUPABASE_DB_PASSWORD"` (read-only; password lives in `.env.local`) - not `db pull --remote`, which in CLI v3 also writes to the hosted migration history.

## Conventions

- TypeScript, `strict: false` today. Don't add new `any`; type new code as if strict were on.
- Round identifiers are the union `1 | 2 | "sweet sixteen" | "elite eight" | "final four" | "finals" | "champion"` (`types/tournament`). Regions: `west | east | south | midwest`, plus `eastWest | southMidwest | championship` for later rounds.
- Barrel `index.ts` files everywhere - export new modules from them and import from the barrel.
- UI: Tailwind + shadcn/ui primitives in `src/components/UI/shadComponents/`, framer-motion for animation, `sonner` toasts, react-hook-form + zod schemas in `src/formSchemas/`.
- Commits: conventional prefixes (`feat:`, `fix:`, `refactor:`). Branch off `main` and open a PR; `main` auto-deploys.
- Preserve current gameplay behavior. Simulation output is random (`Math.random`), so test game logic by stubbing `Math.random` or asserting invariants, not exact scores.

## Legacy / ignore

- `src/components/Add-To-Firebase/` and `src/firebase/`, `scripts/data-scraping`, `data_scraping/` - team-stat scraping that writes to Firebase; `TeamStatsRepository` still reads Firebase. Not part of the Supabase app path.
- `src/mockData/` - fixtures used in dev mode.
