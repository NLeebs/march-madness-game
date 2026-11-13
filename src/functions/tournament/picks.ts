import { PLAYIN_PLACEHOLDERS, ROUND_CONFIG } from "./roundConfig";
import type {
  Pick,
  PlayInGameWinner,
  TournamentPicks,
  TournamentPickMatchup,
  TournamentPlayerPickRound,
  RegionPicks,
} from "@/types";

const EMPTY_TEAM = { team: "", seed: "" };

type PickSlot = { team: string; seed: string };

/** Maps `items` through `fn`, returning `items` itself when every element maps to itself. */
function mapShared<T>(items: readonly T[], fn: (item: T) => T): T[] {
  const mapped = items.map(fn);
  return mapped.every((item, i) => item === items[i]) ? (items as T[]) : mapped;
}

/**
 * Maps every team slot of a round through `fn` (which returns the slot itself
 * or a replacement). Unchanged matchups, regions and rounds keep their
 * references, so selectors on them don't re-render.
 */
function mapRound(
  roundPicks: RegionPicks,
  fn: (slot: PickSlot) => PickSlot
): RegionPicks {
  let changed = false;
  const next: RegionPicks = {};
  (Object.keys(roundPicks) as (keyof RegionPicks)[]).forEach((region) => {
    const matchups = roundPicks[region] as TournamentPickMatchup[];
    next[region] = mapShared(matchups, (matchup) => mapShared(matchup, fn));
    if (next[region] !== matchups) changed = true;
  });
  return changed ? next : roundPicks;
}

/** Maps each listed pick round through `mapRound`, returning `picks` itself when none changed. */
function mapRounds(
  picks: TournamentPicks,
  keys: readonly TournamentPlayerPickRound[],
  fn: (slot: PickSlot) => PickSlot
): TournamentPicks {
  let next = picks;
  keys.forEach((key) => {
    const round = mapRound(picks[key], fn);
    if (round !== picks[key]) {
      if (next === picks) next = { ...picks };
      next[key] = round;
    }
  });
  return next;
}

/**
 * Records a pick (skipped when `team` is empty), then clears the opponent from every later round
 * (when `opponent` is non-empty, even if the write was skipped). Never mutates `picks`.
 */
export function applyPick(picks: TournamentPicks, pick: Pick): TournamentPicks {
  const config = ROUND_CONFIG[pick.round];
  let next = picks;

  if (pick.team !== "") {
    const key = config.nextPicksKey;
    const row = Math.floor(+pick.roundIndex / 2);
    const col = +pick.roundIndex % 2;
    const regionMatchups = picks[key][pick.region] as TournamentPickMatchup[];
    next = {
      ...picks,
      [key]: {
        ...picks[key],
        [pick.region]: regionMatchups.map((matchup, r) =>
          r === row
            ? matchup.map((slot, c) =>
                c === col ? { team: pick.team, seed: pick.seed } : slot
              )
            : matchup
        ),
      },
    };
  }

  if (pick.opponent !== "") {
    next = mapRounds(next, config.laterPicksKeys, (slot) =>
      slot.team === pick.opponent ? { ...EMPTY_TEAM } : slot
    );
  }

  return next;
}

/** Replaces a play-in placeholder team name with the winner in every pick round (seed untouched). */
export function replacePlayinPlaceholder(
  picks: TournamentPicks,
  winner: PlayInGameWinner
): TournamentPicks {
  const [game1, game2] =
    winner.seedType === "sixteenSeeds"
      ? PLAYIN_PLACEHOLDERS.sixteenSeeds
      : PLAYIN_PLACEHOLDERS.elevenSeeds;
  const placeholder = winner.gameIndex === 0 ? game1 : game2;

  return mapRounds(
    picks,
    Object.keys(picks) as TournamentPlayerPickRound[],
    (slot) =>
      slot.team === placeholder ? { ...slot, team: winner.winningTeam } : slot
  );
}
