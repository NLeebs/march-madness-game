# Step 11 - `apiGet` / `useApiQuery` helper, typed responses (short design)

Roadmap step 11 in `docs/DIAGNOSIS.md`; fixes finding 12 and the remaining half of finding 32.

## Intent

About 20 TanStack Query hooks in `src/hooks/` repeat the same `fetch -> !ok -> throw AppError -> json()` block (13 times in `useMadnessPrep`), and most return untyped (`any`) data. Collapse the block into one helper, type every response, and parallelize `GetYears`.

## Goals

- `apiGet<T>(path, action)` in `src/utils/` (exported from the barrel): `fetch(path)`; on `!response.ok` throw `await apiError(response, action)` (existing `src/utils/apiErrorReason.ts`); else return `(await response.json()) as T`.
- `useApiQuery<T>(queryKey, path, action, { enabled? })` in `src/hooks/`: `useQuery<T>({ queryKey, queryFn: () => apiGet<T>(path, action), enabled })`.
- Every GET hook becomes a thin wrapper over `useApiQuery` with a typed response (types from `models/appStatsData` or the use case's return type), keeping its name, query key, `enabled` condition and return shape.
- `useMadnessPrep`: a table of its 13 queries driven by one loop/`useQueries`, returning the same field names.
- `useRestartTheGame` uses `apiGet` for `/api/years`.
- `GetYears` loads the tournament and team-stats year lists with `Promise.all` (finding 32).

## Non-goals

- No changes to callers, routes, query keys, or the POST helpers (`playSeasonPost`, `playTournamentPost`).
- Not moving team stats off Firebase; not enabling `strict`.

## Anti-goals

- Any change to gameplay, UI, or what a hook returns on success.

## Constraints

- TDD: failing tests first for `apiGet`, `useApiQuery`, and `GetYears` (mock repositories with `vi.mock`).
- Error messages change on purpose: hooks now throw `apiError`'s message ("Failed to fetch years (500 CODE): ..."), carrying the server's reason. This is the one visible change.
- No new `any`.

## Approaches

1. **Helper + thin typed wrappers (picked).** Keeps every caller unchanged and gives typing per endpoint in one place.
2. Replace the hooks with `useApiQuery` calls in components - more churn in components, loses named hooks. Rejected.
3. Only dedupe `useMadnessPrep` - leaves the rest of the boilerplate. Rejected.

## Left to the builder

- Exact response type for each route (look at the use case behind each route).
- Whether `useMadnessPrep` uses `useQueries` or a loop of `useApiQuery` calls over a fixed array (both are stable hook order).
- Update finding 12 and 32 in `docs/DIAGNOSIS.md` as fixed in step 11.
