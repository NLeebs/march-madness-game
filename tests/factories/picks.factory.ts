import { emptyPicks } from "@/src/functions/tournament/emptyState";
import { applyPick } from "@/src/functions/tournament/picks";
import {
  ROUND_CONFIG,
  SCORED_ROUNDS,
  nextRegionOf,
} from "@/src/functions/tournament/roundConfig";
import type {
  TournamentPicks,
  TournamentRegion,
  TournamentRoundMatchups,
} from "@/types";

type Slot = { team: string; seed: string | number };

/** Picks the better seed (team index 0 on a tie) in every game, like pickChalk in tests/game/helpers/runGame.ts. */
export function chalkPicks(roundOne: TournamentRoundMatchups): TournamentPicks {
  let picks = emptyPicks();
  SCORED_ROUNDS.forEach((round, r) => {
    const source = (
      r === 0 ? roundOne : picks[ROUND_CONFIG[SCORED_ROUNDS[r - 1]].nextPicksKey]
    ) as unknown as Record<TournamentRegion | "playin", Slot[][]>;
    (Object.keys(source) as (TournamentRegion | "playin")[]).forEach(
      (region) => {
        if (region === "playin") return;
        source[region].forEach((matchup, index) => {
          const better =
            Number(matchup[1].seed) < Number(matchup[0].seed) ? 1 : 0;
          picks = applyPick(picks, {
            round,
            region: nextRegionOf(round, region),
            roundIndex: ROUND_CONFIG[round].advance[region]?.teamIndex ?? index,
            team: matchup[better].team,
            seed: String(matchup[better].seed),
            opponent: matchup[1 - better].team,
          });
        });
      }
    );
  });
  return picks;
}
