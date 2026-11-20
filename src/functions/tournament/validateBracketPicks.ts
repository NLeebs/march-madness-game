import { ROUND_CONFIG, SCORED_ROUNDS, nextRegionOf } from "./roundConfig";
import type {
  TournamentPicks,
  TournamentRegion,
  TournamentRoundMatchups,
} from "@/types";

type Slot = { team: string; seed: string | number };
type Games = Record<string, Slot[][] | undefined>;

/**
 * Checks that `picks` is a consistent bracket for `roundOne`: every slot is
 * filled and holds one of the two teams (same team and seed) feeding its game,
 * where later rounds' teams are the player's own earlier picks. Returns one
 * message per problem; empty means valid.
 */
export function validateBracketPicks(
  roundOne: TournamentRoundMatchups,
  picks: TournamentPicks
): string[] {
  const problems: string[] = [];
  SCORED_ROUNDS.forEach((round, r) => {
    const config = ROUND_CONFIG[round];
    const source = (
      r === 0 ? roundOne : picks[ROUND_CONFIG[SCORED_ROUNDS[r - 1]].nextPicksKey]
    ) as unknown as Games;
    const target = picks[config.nextPicksKey] as unknown as Games;
    (Object.keys(source) as (TournamentRegion | "playin")[]).forEach(
      (region) => {
        if (region === "playin") return;
        (source[region] ?? []).forEach((candidates, i) => {
          const nextRegion = nextRegionOf(round, region);
          const slotIndex = config.advance[region]?.teamIndex ?? i % 2;
          const where = `${config.nextPicksKey} ${nextRegion} game ${Math.floor(i / 2)} slot ${slotIndex}`;
          const slot = target[nextRegion]?.[Math.floor(i / 2)]?.[slotIndex];
          if (!slot || !slot.team) {
            problems.push(`${where}: no pick`);
            return;
          }
          const match = candidates.some(
            (c) => c.team === slot.team && String(c.seed) === String(slot.seed)
          );
          if (!match) {
            problems.push(
              `${where}: ${slot.team} (seed ${slot.seed}) is not a team in its game`
            );
          }
        });
      }
    );
  });
  return problems;
}
