import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { getTeamStatisticsByYearId } from "@/application/useCases/team/GetTeamStatisticsByYearId";
import { simulateSeason } from "@/src/functions/regularSeason/simulateSeason";
import {
  compactSeason,
  type SeasonWire,
} from "@/src/functions/regularSeason/seasonWire";
import { signFieldToken } from "@/utils/api/fieldToken";
import { ValidationError } from "@/utils/errorHandling";

export type PlaySeasonResult = SeasonWire & { yearId: string; fieldToken: string };

/**
 * Plays a whole regular season on the server, picks the tournament field and
 * signs it. An unknown year (no scoring rules) is a ValidationError; load
 * failures and a missing signing secret are server errors.
 */
export async function playSeason({
  yearId,
}: {
  yearId: string;
}): Promise<PlaySeasonResult> {
  const rules = await new TournamentRepository().findBracketScoringRulesByYearId(
    yearId
  );
  if (rules === null) {
    throw new ValidationError(`Unknown year: ${yearId}`);
  }

  const teamStats = await getTeamStatisticsByYearId(yearId);
  const wire = compactSeason(simulateSeason(teamStats, Math.random));
  const { selection } = wire;

  const fieldToken = signFieldToken({
    yearId,
    field: {
      tournamentTeams: selection.field,
      playinTeams: {
        elevenSeeds: selection.elevenSeedPlayins,
        sixteenSeeds: selection.sixteenSeedPlayins,
      },
    },
  });

  return { ...wire, yearId, fieldToken };
}
