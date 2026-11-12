import type { Page, Route } from "@playwright/test";
import type { getYears, PersistTournamentResult } from "@/application/useCases";
import type { SimulationRequestBody } from "@/app/api/bracket/simulation/route";
import { E2E_YEARS, e2eTeamStats } from "../fixtures/league";
import {
  PREP_LISTS,
  SEED_UPSET_PATH,
  dashboardBrackets,
  dashboardConference,
  dashboardPrepList,
  dashboardProfile,
  dashboardSeedUpsets,
  dashboardTeam,
  dashboardUserPicks,
  dashboardUserStats,
  isDashboardYearId,
} from "../fixtures/dashboard";
import { FAKE_USER, installFakeAuth } from "./fakeAuth";

export type FakeBackendOptions = {
  persistStatus?: number;
  teamStatsDelayMs?: number;
  /** Serve the dashboard endpoints (user-scoped ones for FAKE_USER only; others get 403). */
  dashboard?: boolean;
};

export type FakeBackend = {
  persistRequests: SimulationRequestBody[];
  requestedPaths: string[];
  unhandled: string[];
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * Answers a dashboard endpoint, or returns undefined when the path is not one. Reads are
 * GET-only; user-scoped endpoints return 403 for any user other than FAKE_USER.
 */
function dashboardResponse(pathname: string): { body: unknown; status: number } | undefined {
  const ok = (body: unknown) => ({ body, status: 200 });
  const notFound = { body: { error: "Not found" }, status: 404 };
  const forbidden = { body: { error: "Forbidden" }, status: 403 };

  const userScoped = pathname.match(
    /^\/api\/(profile|brackets|user-statistics|pick-count)\/([^/]+)(?:\/([^/]+))?$/,
  );
  if (userScoped) {
    const [, kind, rawUser, rawYear] = userScoped;
    if (decodeURIComponent(rawUser) !== FAKE_USER.id) return forbidden;
    if (kind === "profile") return rawYear ? undefined : ok(dashboardProfile);
    const yearId = rawYear ? decodeURIComponent(rawYear) : "";
    if (!isDashboardYearId(yearId)) return notFound;
    if (kind === "brackets") return ok(dashboardBrackets(yearId));
    if (kind === "user-statistics") return ok(dashboardUserStats(yearId));
    return ok(dashboardUserPicks(yearId));
  }

  const team = pathname.match(/^\/api\/team\/([^/]+)$/);
  if (team) {
    const row = dashboardTeam(decodeURIComponent(team[1]));
    return row ? ok(row) : notFound;
  }
  const conference = pathname.match(/^\/api\/conference\/([^/]+)$/);
  if (conference) {
    const row = dashboardConference(decodeURIComponent(conference[1]));
    return row ? ok(row) : notFound;
  }

  const seeds = pathname.match(new RegExp(`^${SEED_UPSET_PATH}/([^/]+)$`));
  if (seeds) {
    const yearId = decodeURIComponent(seeds[1]);
    return isDashboardYearId(yearId) ? ok(dashboardSeedUpsets(yearId)) : notFound;
  }
  for (const list of PREP_LISTS) {
    if (!pathname.startsWith(`${list.path}/`)) continue;
    const yearId = decodeURIComponent(pathname.slice(list.path.length + 1));
    if (yearId.includes("/")) continue;
    return isDashboardYearId(yearId) ? ok(dashboardPrepList(yearId, list)) : notFound;
  }
  return undefined;
}

export async function installFakeBackend(
  page: Page,
  opts: FakeBackendOptions = {},
): Promise<FakeBackend> {
  const backend: FakeBackend = {
    persistRequests: [],
    requestedPaths: [],
    unhandled: [],
  };

  await installFakeAuth(page);

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    backend.requestedPaths.push(pathname);

    if (method === "GET" && pathname === "/api/years") {
      const years: Awaited<ReturnType<typeof getYears>> = E2E_YEARS;
      return json(route, years);
    }

    const stats = pathname.match(/^\/api\/team-statistics\/([^/]+)$/);
    if (method === "GET" && stats) {
      const yearId = decodeURIComponent(stats[1]);
      if (!E2E_YEARS.some((y) => y.id === yearId)) {
        return json(route, { error: "Unknown year" }, 404);
      }
      if (opts.teamStatsDelayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, opts.teamStatsDelayMs),
        );
      }
      return json(route, e2eTeamStats(yearId));
    }

    const rules = pathname.match(/^\/api\/tournament-scoring-rules\/([^/]+)$/);
    if (method === "GET" && rules) {
      return json(route, {
        tournamentScoringRuleId: `e2e-rules-${decodeURIComponent(rules[1])}`,
        message: "Tournament scoring rules ID received",
      });
    }

    if (method === "POST" && pathname === "/api/bracket/simulation") {
      backend.persistRequests.push(
        request.postDataJSON() as SimulationRequestBody,
      );
      const result: PersistTournamentResult = {
        bracketId: "e2e-bracket",
        success: true,
      };
      return json(route, result, opts.persistStatus ?? 200);
    }

    if (opts.dashboard && method === "GET") {
      const answer = dashboardResponse(pathname);
      if (answer) return json(route, answer.body, answer.status);
    }

    backend.unhandled.push(`${method} ${pathname}`);
    return json(route, { error: "Not handled by the e2e fake backend" }, 501);
  });

  return backend;
}
