import type { Page, Route } from "@playwright/test";
import type { getYears, PersistTournamentResult } from "@/application/useCases";
import type { SimulationRequestBody } from "@/app/api/bracket/simulation/route";
import { E2E_YEARS, e2eTeamStats } from "../fixtures/league";
import { installFakeAuth } from "./fakeAuth";

export type FakeBackendOptions = {
  persistStatus?: number;
  teamStatsDelayMs?: number;
  /** Used by a later task (dashboards). Inert for now. */
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

    backend.unhandled.push(`${method} ${pathname}`);
    return json(route, { error: "Not handled by the e2e fake backend" }, 501);
  });

  return backend;
}
