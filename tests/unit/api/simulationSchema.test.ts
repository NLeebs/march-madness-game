import { describe, it, expect } from "vitest";
import { SimulationRequestSchema } from "@/app/api/bracket/simulation/schema";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import { buildLeague, chalkPicks } from "@/tests/factories";

const league = buildLeague();
const teamNames = Object.values(league.teamStats).flatMap((conf) =>
  Object.keys(conf)
);
const YEAR_ID = "123e4567-e89b-42d3-a456-426614174000";
const ANON_ID = "223e4567-e89b-42d3-a456-426614174001";

const buildBody = () => {
  const field = {
    tournamentTeams: teamNames.slice(0, 60),
    playinTeams: {
      elevenSeeds: teamNames.slice(60, 64),
      sixteenSeeds: teamNames.slice(64, 68),
    },
  };
  const roundOne = buildRoundOneMatchups(
    seedTournament(field.tournamentTeams),
    field.playinTeams
  );
  return {
    fieldToken: "signed.token",
    picks: chalkPicks(roundOne),
    anonUserId: ANON_ID,
  };
};

type Body = ReturnType<typeof buildBody>;
const rejects = (mutate: (body: Body) => unknown, path: (string | number)[]) => {
  const body = buildBody();
  const result = SimulationRequestSchema.safeParse(mutate(body) ?? body);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.map((i) => i.path)).toContainEqual(path);
  }
};

describe("SimulationRequestSchema", () => {
  it("accepts a valid body", () => {
    expect(SimulationRequestSchema.safeParse(buildBody()).success).toBe(true);
  });

  it("accepts a null or missing anonUserId", () => {
    expect(
      SimulationRequestSchema.safeParse({ ...buildBody(), anonUserId: null })
        .success
    ).toBe(true);
    const { anonUserId: _omit, ...rest } = buildBody();
    expect(SimulationRequestSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects userId", () => {
    const result = SimulationRequestSchema.safeParse({
      ...buildBody(),
      userId: ANON_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].code).toBe("unrecognized_keys");
  });

  it("rejects playerScore", () => {
    const result = SimulationRequestSchema.safeParse({
      ...buildBody(),
      playerScore: 100,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].code).toBe("unrecognized_keys");
  });

  it("rejects an unknown key nested in a pick slot", () => {
    rejects((b) => {
      (b.picks.roundTwoPicks.west![0][0] as Record<string, unknown>).extra = 1;
    }, ["picks", "roundTwoPicks", "west", 0, 0]);
  });

  it("accepts fieldToken + picks", () => {
    const { anonUserId: _omit, ...rest } = buildBody();
    expect(SimulationRequestSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects a body with field", () => {
    const result = SimulationRequestSchema.safeParse({
      ...buildBody(),
      field: { tournamentTeams: [], playinTeams: {} },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].code).toBe("unrecognized_keys");
  });

  it("rejects a body with yearId", () => {
    const result = SimulationRequestSchema.safeParse({
      ...buildBody(),
      yearId: YEAR_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].code).toBe("unrecognized_keys");
  });

  it("rejects a missing fieldToken", () => {
    const { fieldToken: _omit, ...rest } = buildBody();
    const result = SimulationRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path)).toContainEqual(["fieldToken"]);
    }
  });

  it("rejects an empty fieldToken", () => {
    rejects((b) => {
      b.fieldToken = "";
    }, ["fieldToken"]);
  });

  it("rejects a missing region", () => {
    rejects((b) => {
      delete b.picks.roundTwoPicks.west;
    }, ["picks", "roundTwoPicks", "west"]);
  });

  it("rejects 3 matchups in a region", () => {
    rejects((b) => {
      b.picks.roundTwoPicks.west = b.picks.roundTwoPicks.west!.slice(0, 3);
    }, ["picks", "roundTwoPicks", "west"]);
  });

  it("rejects an empty team", () => {
    rejects((b) => {
      b.picks.roundTwoPicks.west![0][0].team = "";
    }, ["picks", "roundTwoPicks", "west", 0, 0, "team"]);
  });

  it('rejects seed "17"', () => {
    rejects((b) => {
      b.picks.roundTwoPicks.west![0][0].seed = "17";
    }, ["picks", "roundTwoPicks", "west", 0, 0, "seed"]);
  });

  it("rejects a non-uuid anonUserId", () => {
    rejects((b) => {
      b.anonUserId = "not-a-uuid";
    }, ["anonUserId"]);
  });
});
