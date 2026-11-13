import { PLAYIN_PLACEHOLDERS, ROUND_CONFIG } from "./roundConfig";
import type {
  Pick,
  PlayInGameWinner,
  TournamentPicks,
  TournamentPickMatchup,
  RegionPicks,
} from "@/types";

const EMPTY_TEAM = { team: "", seed: "" };

/** Copies a round's picks, mapping every team slot through `fn` (which returns the slot or a replacement). */
function mapRound(
  roundPicks: RegionPicks,
  fn: (slot: { team: string; seed: string }) => { team: string; seed: string }
): RegionPicks {
  return Object.fromEntries(
    Object.entries(roundPicks).map(([region, matchups]) => [
      region,
      (matchups as TournamentPickMatchup[]).map((matchup) => matchup.map(fn)),
    ])
  ) as RegionPicks;
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
    const cleared = { ...next };
    config.laterPicksKeys.forEach((key) => {
      cleared[key] = mapRound(next[key], (slot) =>
        slot.team === pick.opponent ? { ...EMPTY_TEAM } : slot
      );
    });
    next = cleared;
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

  const next = { ...picks };
  (Object.keys(picks) as (keyof TournamentPicks)[]).forEach((key) => {
    next[key] = mapRound(picks[key], (slot) =>
      slot.team === placeholder ? { ...slot, team: winner.winningTeam } : slot
    );
  });
  return next;
}
