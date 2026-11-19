import { describe, it, expect } from "vitest";
import { checkSimulationRequest, apiError } from "../../../e2e/support/simulationRequest";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import { buildLeague, chalkPicks } from "@/tests/factories";
import type { TournamentPicks } from "@/types";

const YEAR_ID = "11111111-1111-4111-8111-111111111111";
const league = buildLeague();
const teamNames = Object.values(league.teamStats).flatMap((conf) => Object.keys(conf));
const field = {
  tournamentTeams: teamNames.slice(0, 60),
  playinTeams: {
    elevenSeeds: teamNames.slice(60, 64),
    sixteenSeeds: teamNames.slice(64, 68),
  },
};
const picks = chalkPicks(
  buildRoundOneMatchups(seedTournament(field.tournamentTeams), field.playinTeams)
);

/** A body like the one the browser posts, as parsed JSON. */
function body(overrides: { picks?: TournamentPicks } = {}) {
  return JSON.parse(
    JSON.stringify({ yearId: YEAR_ID, field, picks: overrides.picks ?? picks, anonUserId: null })
  ) as Record<string, unknown>;
}

describe("checkSimulationRequest (e2e fake backend)", () => {
  it("accepts a consistent bracket for the served league", () => {
    const result = checkSimulationRequest(body(), league.teamStats);
    expect("error" in result).toBe(false);
  });

  it("answers a schema failure like handleApiError does for the route", () => {
    const bad = body();
    const firstGame = (bad.picks as TournamentPicks).roundTwoPicks.east[0];
    (firstGame[0] as unknown as Record<string, unknown>).extra = 1;

    const result = checkSimulationRequest(bad, league.teamStats);

    expect("error" in result && result.error.status).toBe(400);
    if (!("error" in result)) return;
    expect(result.error.body).toMatchObject({
      success: false,
      error: {
        message: "Request validation failed",
        code: "VALIDATION_ERROR",
        statusCode: 400,
        path: "/api/bracket/simulation",
      },
    });
    expect(result.error.body.error.details).toContainEqual(
      expect.objectContaining({ field: "picks.roundTwoPicks.east.0.0", code: "unrecognized_keys" })
    );
  });

  it("rejects a numeric seed", () => {
    const bad = body();
    const slot = (bad.picks as TournamentPicks).roundTwoPicks.east[0][0] as unknown as Record<string, unknown>;
    slot.seed = Number(slot.seed);

    const result = checkSimulationRequest(bad, league.teamStats);

    expect("error" in result && result.error.status).toBe(400);
  });

  it("rejects picks that do not follow from round one", () => {
    const bad = body();
    const later = bad.picks as TournamentPicks;
    // The sweet sixteen pick names a team the player did not pick in round two.
    const slot = later.roundSweetSixteenPicks.east[0][0];
    const notPicked = later.roundTwoPicks.west[0][0];
    slot.team = notPicked.team;
    slot.seed = notPicked.seed;

    const result = checkSimulationRequest(bad, league.teamStats);

    if (!("error" in result)) throw new Error("expected an error");
    expect(result.error.status).toBe(400);
    expect(result.error.body.error.message).toMatch(/^Inconsistent picks: /);
  });

  it("rejects a field team the served league does not have", () => {
    const bad = body();
    (bad.field as typeof field).tournamentTeams[0] = "Nowhere State";

    const result = checkSimulationRequest(bad, league.teamStats);

    if (!("error" in result)) throw new Error("expected an error");
    expect(result.error.status).toBe(400);
    expect(result.error.body.error.message).toContain("Nowhere State");
  });
});

describe("apiError", () => {
  it("has handleApiError's JSON shape", () => {
    expect(apiError(500, "e2e simulated failure")).toEqual({
      status: 500,
      body: {
        success: false,
        error: {
          message: "e2e simulated failure",
          statusCode: 500,
          timestamp: expect.any(String),
          path: "/api/bracket/simulation",
        },
      },
    });
  });
});
