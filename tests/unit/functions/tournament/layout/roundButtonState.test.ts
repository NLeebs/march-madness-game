import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import {
  areRoundPicksComplete,
  getRoundButtonState,
  type RoundButtonState,
} from "@/src/functions/tournament/layout/roundButtonState";
import { emptyPicks } from "@/src/functions/tournament/emptyState";
import { tournamentActions } from "@/store";
import { fieldStore } from "@/tests/game/helpers/fieldStore";
import { pickChalk } from "@/tests/game/helpers/runGame";
import type { TournamentPicks, TournamentRound } from "@/types";

void React;
afterEach(() => cleanup());

const BUTTONS: TournamentRound[] = [1, 2, "sweet sixteen", "elite eight", "final four", "finals"];
const SELECTED: TournamentRound[] = [1, 2, "sweet sixteen", "elite eight", "final four", "finals", "champion"];
const CODE: Record<string, RoundButtonState> = { S: "shrink", D: "default", U: "unchanged" };

/** Per band: both edge widths, then the six buttons' states for each selected round in SELECTED order. */
const BANDS: [number[], string[]][] = [
  [[2041, 2400], ["DDDDDD", "DDDDDD", "DDDDDD", "DDDDDD", "DDDDDD", "DDDDDD", "DDDDDD"]],
  [[1701, 2040], ["UUUUUU", "SDUUUU", "SDUUUU", "SDUUUU", "SDUUUU", "SDUUUU", "UUUUUU"]],
  [[1401, 1700], ["UUUUUU", "SDUUUU", "SSDUUU", "SSDUUU", "SSDUUU", "SSDUUU", "UUUUUU"]],
  [[1025, 1400], ["UUUUUU", "SDUUUU", "SSDUUU", "SSSDUU", "SSSDUU", "SSSDUU", "UUUUUU"]],
  [[769, 1024], ["UUUUUU", "SDUUUU", "SSDUUU", "SSSDUU", "SSSSDU", "SSSSDU", "UUUUUU"]],
  [[390, 768], ["UUUUUU", "SDUUUU", "SSDUUU", "SSSDUU", "SSSSDU", "SSSSSD", "UUUUUU"]],
];

describe("getRoundButtonState", () => {
  const cases = BANDS.flatMap(([widths, rows]) =>
    widths.flatMap((w) => SELECTED.map((sel, i) => [w, sel, rows[i]] as const)),
  );
  it.each(cases)("w=%i sel=%s -> %s", (w, sel, row) => {
    const states = BUTTONS.map((round) => getRoundButtonState(round, sel, w));
    expect(states).toEqual(row.split("").map((c) => CODE[c]));
  });

  it.each([390, 1024, 2040])("leaves a round with no button unchanged (w=%i)", (w) => {
    expect(getRoundButtonState("champion", "finals", w)).toBe("unchanged");
  });
});

describe("areRoundPicksComplete", () => {
  const chalk = (): TournamentPicks => {
    const { store } = fieldStore(1);
    store.dispatch(tournamentActions.setRoundOneMatchups());
    pickChalk(store);
    return store.getState().tournamentPlayersPicks.picks;
  };

  it("is false for every round with no picks", () => {
    for (const round of BUTTONS) expect(areRoundPicksComplete(round, emptyPicks())).toBe(false);
  });

  it("is true for rounds 2 to finals once every pick is made; round 1 and champion stay false", () => {
    const picks = chalk();
    expect(BUTTONS.map((r) => areRoundPicksComplete(r, picks))).toEqual([false, true, true, true, true, true]);
    expect(areRoundPicksComplete("champion", picks)).toBe(false);
  });

  it("finals needs both the finals picks and the champion", () => {
    const picks = chalk();
    const blanked: TournamentPicks = {
      ...picks,
      roundFinalsPicks: {
        ...picks.roundFinalsPicks,
        championship: [[{ team: "", seed: "" }, picks.roundFinalsPicks.championship[0][1]]],
      },
    };
    expect(areRoundPicksComplete("finals", blanked)).toBe(false);
    expect(areRoundPicksComplete("final four", blanked)).toBe(true);
  });
});
