import { z } from "zod";

const teamName = z.string().min(1);

const pickSlot = z
  .object({
    team: teamName,
    seed: z.string().regex(/^(1[0-6]|[1-9])$/),
  })
  .strict();

const matchup = z.tuple([pickSlot, pickSlot]);

/** `matchups` games in each of the given regions, two slots per game. */
const roundPicks = <K extends string>(regions: readonly K[], matchups: number) =>
  z
    .object(
      Object.fromEntries(
        regions.map((region) => [region, z.array(matchup).length(matchups)])
      ) as Record<K, z.ZodArray<typeof matchup>>
    )
    .strict();

const FOUR_REGIONS = ["west", "east", "south", "midwest"] as const;

const picks = z
  .object({
    roundTwoPicks: roundPicks(FOUR_REGIONS, 4),
    roundSweetSixteenPicks: roundPicks(FOUR_REGIONS, 2),
    roundEliteEightPicks: roundPicks(FOUR_REGIONS, 1),
    roundFinalFourPicks: roundPicks(["eastWest", "southMidwest"], 1),
    roundFinalsPicks: roundPicks(["championship"], 1),
    champion: z
      .object({ champion: z.array(z.tuple([pickSlot])).length(1) })
      .strict(),
  })
  .strict();

const field = z
  .object({
    tournamentTeams: z.array(teamName).length(60),
    playinTeams: z
      .object({
        elevenSeeds: z.array(teamName).length(4),
        sixteenSeeds: z.array(teamName).length(4),
      })
      .strict(),
  })
  .strict()
  .refine(
    (f) =>
      new Set([
        ...f.tournamentTeams,
        ...f.playinTeams.elevenSeeds,
        ...f.playinTeams.sixteenSeeds,
      ]).size === 68,
    { message: "All 68 team names must be distinct" }
  );

export const SimulationRequestSchema = z
  .object({
    yearId: z.string().uuid(),
    field,
    picks,
    anonUserId: z.string().uuid().nullable().optional(),
  })
  .strict();

export type SimulationRequestBody = z.infer<typeof SimulationRequestSchema>;
