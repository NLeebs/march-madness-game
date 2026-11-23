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

export const SimulationRequestSchema = z
  .object({
    // Signed by POST /api/season; the year and field come only from it.
    fieldToken: z.string().min(1),
    picks,
    anonUserId: z.string().uuid().nullable().optional(),
  })
  .strict();

export type SimulationRequestBody = z.infer<typeof SimulationRequestSchema>;
