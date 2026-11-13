# Error boundary + Sentry crash reports - design

Date: 2026-11-12. Branch: `refactor/step8b-season` (lands with step 8b, PR #17).

## Why

The app has no error boundary (no `app/error.tsx`, no `app/global-error.tsx`). Any error thrown while React renders or runs an effect unmounts the whole tree and leaves a blank page with no message and no way back except a reload. Step 8b made this likelier: `selectTournamentField` now throws on malformed data, and its only caller (`SelectionSunday`) runs it in a `useEffect`. Before 8b the bad-data cases limped on; now they blank the game.

The developer (the user) has never seen a crash in production and has no way to find out about one. They want:

1. The player told that something went wrong, and sent back to the home screen to start over.
2. An email to the developer for each crash, saying what the error was, when it happened, what the player was doing, and - when the error can say - which data was bad (which team, which conference).

The user chose **Sentry** (free plan) for reporting and email, partly to try the service out.

No roadmap step covers an error boundary (step 9 mounts a `<Toaster>` for finding 43, which is a different thing), so it is added here.

## Goals

- No blank page on a render or effect error, anywhere in the app.
- A friendly message and one button back to a fresh game / the home page.
- Every crash reported to Sentry with enough context to diagnose it without the player's help; Sentry emails the developer (its default alert for a new issue).
- Bad-data errors from the game logic carry the offending names (team, conference, counts) as structured data, so the Sentry event shows them as fields, not only inside the message string.

## Non-goals

- Network / API failures that don't throw during render (finding 43, the silent save failure). They stay in step 9 with the toasts.
- Recovering the in-progress game. A crashed game is discarded; its state may be the cause.
- Performance tracing, session replay, profiling, user feedback dialogs. Errors only.
- Server-side route error reporting beyond what Sentry's Next.js SDK does by default. Routes already go through `handleApiError`; wiring it to Sentry is a later step (see "Left for later").

## Anti-goals (a failure even if it works)

- Sending the player's email address or other personal data to Sentry. Ids only.
- Sending the whole Redux store (the season schedule alone is ~5,400 games) - too large, and Sentry truncates it.
- Reports from tests, e2e runs or local dev cluttering the Sentry project or the inbox.
- Changing gameplay or the random-draw order. Game-engine pins in `tests/game/` must not change.
- Going past Sentry's free plan or the Supabase free plan (Supabase is not touched at all).

## What the player sees

Three layers, using Next.js App Router conventions:

| File | Catches | Button |
|---|---|---|
| Game boundary inside `<Provider>` in `app/page.tsx` (wraps `NavigationBar` + `App`) | Any error in the game | "Start a new game" |
| `app/error.tsx` | Errors in any other route segment (dashboard, auth pages, forgot-password) | "Back to home" |
| `app/global-error.tsx` | Errors in the root layout / `Providers` themselves | "Back to home" |

- Copy (my call, adjust freely): heading "Something went wrong", body "Sorry about that. We've been notified and will look into it." No raw error text, no stack.
- The button does a full page load of `/` (`window.location.assign("/")`), my call. A reload discards the module-level Redux store, React Query cache and any half-run timers, so nothing from the crashed game can leak into the new one. Reusing `useRestartTheGame` was considered and rejected: it dispatches into the same store that may be the cause.
- The fallback is styled with the existing Tailwind tokens and `Button` component, centred on the page background. `global-error.tsx` must render its own `<html><body>` (Next.js requirement) and so cannot rely on the layout's font/background classes; plain Tailwind is fine.
- The game boundary is a client component. React error boundaries must be class components; use `@sentry/nextjs`'s `ErrorBoundary` (a class boundary that also reports), or a small class of our own that calls `Sentry.captureException`. Builder's choice; whichever is used, the fallback UI is our component.
- Error boundaries catch errors thrown during render, in lifecycle methods and in effects (so the `SelectionSunday` effect is covered). They do not catch errors in event handlers, timers or promises; Sentry's global handlers still report those, but the player sees no fallback. That is acceptable for now.

## What the developer gets (Sentry)

- Package: `@sentry/nextjs` (supports Next 14 App Router), set up the standard way: `instrumentation.ts` + `sentry.server.config.ts` / `sentry.edge.config.ts`, client init in `instrumentation-client.ts` (or `sentry.client.config.ts`, whichever the installed SDK version documents), `withSentryConfig` around `next.config.js`.
- **Enabled only when `NEXT_PUBLIC_SENTRY_DSN` is set.** It is set in Vercel for Production (and Preview, tagged with `environment`), and not in `.env.local`, CI or e2e. With no DSN the SDK is not initialized and nothing is sent. This is what keeps tests, e2e and dev out of Sentry.
- `sendDefaultPii: false`. `tracesSampleRate: 0` (errors only), no replay integration. Stays well inside the free plan's error quota.
- Source maps uploaded at build time so stack traces show real source lines: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in Vercel build env only. Without the token the build still succeeds (upload skipped, warning only) - CI and local builds must not fail.
- Ad-blocker resilience: use the SDK's `tunnelRoute` (e.g. `/monitoring`). The existing `middleware.ts` matcher must exclude that path so Supabase session refresh doesn't run on every report.
- Email: Sentry's default alert rule ("new issue -> email the owner") is enough. The user configures it in the Sentry UI; nothing in code.

### Context on each game crash

The game boundary attaches a small summary of the Redux state when it reports (e.g. via `Sentry.withScope` / `setContext("game", ...)` or the boundary's `beforeCapture`):

- game phase - which `appState` flag is true (start screen, regular season, Selection Sunday, tournament, recap...)
- current tournament round, if any
- selected season year
- number of teams loaded, weeks played
- signed in or anonymous, and the user id or `anon_user_id` (ids only, as tags). The signed-in user comes from `AuthProvider` context (it sits above the game boundary). The anonymous id is read straight from localStorage and left out if it doesn't exist yet; the reporter must not call `getAnonUserId()`, which creates the id and throws when `NEXT_PUBLIC_BROWSER_ANON_KEY` is unset, because a throw inside the fallback would defeat it (my call). Most players only get an anon id when `TournamentPersist` runs, so mid-game crashes from anonymous players usually carry no id.

Exact field names are the builder's call; keep the whole context under a few KB.

### Bad-data details

Add a small error class for game-logic data problems, e.g. `GameDataError extends Error` with a `details: Record<string, unknown>` field (home: `src/functions/` or `utils/errorHandling/`, builder's call; export from the barrel). `selectTournamentField`'s three validation throws switch to it, with details such as `{ conference, teamCount }`, `{ team, conference }`, `{ nonChampions, atLargeSpots }`. Messages stay the same. The reporting code copies `details` into the Sentry event (`setContext("gameData", details)`) so the developer sees the team/conference as fields.

Other throws can adopt the class later; this design converts only the three in `selectTournamentField`.

## Testing

TDD per `CLAUDE.md`:

- Unit (vitest + Testing Library): the game boundary renders the fallback when a child throws during render and when a child's effect throws; the button navigates to `/`; it calls the reporting function with the error and the game context (mock `@sentry/nextjs`). Same for `app/error.tsx` (calls report on mount, button goes home).
- Unit: the game-context summary function, from a store built with existing factories (`tests/factories`).
- Unit: `selectTournamentField` throws `GameDataError` with the expected `details` for each of the three cases (extend the existing tests; messages unchanged).
- E2E (my call; builder may defer if it's costly): one spec that forces a crash in the game (e.g. via the e2e store hook or the fake backend serving a one-team conference) and asserts the fallback appears and the button returns to the start screen. The crash is allowlisted in the `errors` fixture with a reason. No Sentry traffic in e2e (no DSN).
- `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npx vitest run` green with no Sentry env vars set.
- Game-engine pins unchanged.

## Docs to update (same PR)

- `CLAUDE.md` Environment: `NEXT_PUBLIC_SENTRY_DSN` (optional; unset = Sentry off), `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` (Vercel build only). Architecture: one line on the boundaries and where crash reports go.
- `docs/DIAGNOSIS.md`: new finding (no error boundary; a throw blanks the app) marked fixed in step 8b; note the step 8b roadmap row; note that `selectTournamentField` throws are now caught and reported.
- `.claude/rules/e2e.md`: mention the crash spec and its allowlist entry, if the e2e test is added.

## Setup the user does (outside the code)

1. Create a free Sentry account and a Next.js project.
2. Give Claude the DSN (public, safe to put in Vercel env) and create an auth token for source maps.
3. Add the env vars in Vercel (Production + Preview).
4. Confirm the "new issue" email alert is on.

The code can be written and tested before step 1; it simply stays off until the DSN exists.

## Left for later

- Reporting caught server errors from `handleApiError` to Sentry.
- Showing errors from event handlers / promises (e.g. with the step 9 toasts).
- Converting other game-logic throws to `GameDataError`.
