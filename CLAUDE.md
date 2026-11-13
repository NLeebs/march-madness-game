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
npm run e2e            # Playwright e2e (npx playwright test); first run builds the app (~40 s); full run ~4 min
npx tsc --noEmit       # type-check (2 CSS-module errors are expected until next-env.d.ts exists; run `npm run build` once)
npm run db:types         # regenerate types/database.ts (local DB must be running)
npm run db:types:check   # fail if types/database.ts is stale (runs in CI)
npm run typecheck:db-types  # model drift test under strictNullChecks (runs in CI)
```

Always use `npx vitest` / `npx tsc` *after* `npm ci` - if `node_modules` is missing, `npx tsc` silently installs an unrelated package named `tsc`.

## Environment

`.env.local` (gitignored) needs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only - never import `supabaseServiceRole.ts` from client code), `NEXT_PUBLIC_APP_URL`, optional `NEXT_PUBLIC_STAGING_URL`, `NEXT_PUBLIC_APP_MODE=dev` (pre-fills picks), `NEXT_PUBLIC_BROWSER_ANON_KEY` (localStorage key for the anonymous player id, required by `src/utils/getAnonUserId.ts`; e2e sets it in `playwright.config.ts`), `NEXT_PUBLIC_FIREBASE_*` (legacy team-stats source only), and optional `NEXT_PUBLIC_SENTRY_DSN` (crash reports; unset = Sentry off, which is how dev, CI and e2e run). `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are set only in Vercel's build env, for source-map upload; builds without them skip the upload. Tests stub Supabase env vars in `src/test-setup.ts` and never hit a real database.

## Architecture

Layered, roughly clean-architecture. Dependencies point downward only:

```
app/                 Next.js routes. app/page.tsx = the game. app/(private)/ = auth-gated pages. app/api/** = route handlers.
  -> application/    useCases/<domain>/<Verb><Noun>.ts (one exported fn per file, re-exported from index.ts) + mappers/
    -> infrastructure/db/   <Domain>Repository classes wrapping Supabase queries/RPCs
      -> models/     DB row types (models/appStatsData/*Supabase.ts, aliases of generated types/database.ts) and team-stat shapes
types/               Game/domain types (tournament, regular season) + generated database.ts (import as @/types/database). tsconfig maps bare imports "*" -> types/*
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

### Crashes
`GameErrorBoundary` (around the game in `app/page.tsx`), `app/error.tsx` and `app/global-error.tsx` render `CrashScreen` ("Something went wrong", button does a full load of `/`) and report through `src/utils/crashReporting` (`reportCrash`, never throws) to Sentry, which emails the developer. Sentry is initialized in `instrumentation-client.ts` / `instrumentation.ts` from `sentryInitOptions` (no personal or request data, no tracing). Browser reports go to `/monitoring` (excluded from `middleware.ts`), which `withSentryConfig` rewrites to `app/sentry-tunnel/route.ts`; it forwards only envelopes for our own DSN. Import `CrashScreen` and its `Button` directly, not through barrels, so the crash pages load even when the rest of the app can't. Game logic that rejects bad data throws `GameDataError(message, details)`; `details` (team, conference, counts) shows up as fields on the Sentry event. Errors in event handlers, timers and promises are not caught by the boundaries.

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

Schema, migrations, generated types, DB tests and the stats schema are in `.claude/rules/database.md`. Never break these:

- Never run writes, migrations, or destructive SQL against the hosted project without explicit confirmation. → `.claude/rules/database.md`
- Migrations auto-apply to production on merge to `main`, so each must work with the currently deployed app code. → `.claude/rules/database.md`
- After every migration, regenerate `types/database.ts` with `npm run db:types` and commit it; CI fails otherwise. → `.claude/rules/database.md`

## Rule index

Rules load automatically when you touch matching files. Before designing or planning a change, read the rule files for every topic it touches.

| Topic | Rule file | Loads when you touch |
|---|---|---|
| Database: schema, migrations, generated types, DB tests, stats schema, hosted-project safety | `.claude/rules/database.md` | `supabase/**`, `infrastructure/db/**`, `models/**`, `types/database.ts`, `scripts/db/**` |
| Game engine: seeded RNG, characterization tests (fixed contract, statistical checks, draw-order pins), pin regeneration | `.claude/rules/game-engine.md` | `src/functions/**`, `store/**`, `src/components/RegularSeason/**`, `src/components/Tournament/**`, `tests/factories/league*`, `tests/game/**` |
| E2E: Playwright suite, fake backend, store snapshot, tags/projects, phase timeouts, console allowlist, known layout issues, resize signatures | `.claude/rules/e2e.md` | `e2e/**`, `playwright.config.ts` |

## Conventions

- TypeScript, `strict: false` today. Don't add new `any`; type new code as if strict were on.
- Round identifiers are the union `1 | 2 | "sweet sixteen" | "elite eight" | "final four" | "finals" | "champion"` (`types/tournament`). Regions: `west | east | south | midwest`, plus `eastWest | southMidwest | championship` for later rounds.
- Barrel `index.ts` files everywhere - export new modules from them and import from the barrel.
- UI: Tailwind + shadcn/ui primitives in `src/components/UI/shadComponents/`, framer-motion for animation, `sonner` toasts, react-hook-form + zod schemas in `src/formSchemas/`.
- Commits: conventional prefixes (`feat:`, `fix:`, `refactor:`). Branch off `main` and open a PR; `main` auto-deploys.
- Preserve current gameplay behavior. The game engine is under characterization tests; how they work and when pins may change is in `.claude/rules/game-engine.md`.

## Workflow

- **Spec -> plan -> build with the superpowers skills.** For any new feature, behavior change or multi-step refactor, start with `superpowers:brainstorming` to agree a written spec, then `superpowers:writing-plans` for a step-by-step plan, then execute it (`superpowers:subagent-driven-development` or `superpowers:executing-plans`). Specs and plans are committed under `docs/superpowers/` (the skills' default location). Skip this only for trivial fixes, typos and docs-only changes.
- **Test-driven development.** Follow `superpowers:test-driven-development`: write a failing test, watch it fail for the right reason, write the minimal code to pass, then refactor. This applies to app code (vitest), database changes (pgTAP: write the failing policy/RPC test before the migration) and bug fixes (reproduce with a test first). For refactors of untested code, add characterization tests first (see `docs/DIAGNOSIS.md` step 6).
- Debug with `superpowers:systematic-debugging`; run `superpowers:verification-before-completion` (tests, lint, `tsc`) before claiming work is done or opening a PR.

## Legacy / ignore

- `src/components/Add-To-Firebase/` and `src/firebase/`, `scripts/data-scraping`, `data_scraping/` - team-stat scraping that writes to Firebase; `TeamStatsRepository` still reads Firebase. Not part of the Supabase app path.
- `src/mockData/` - fixtures used in dev mode.
