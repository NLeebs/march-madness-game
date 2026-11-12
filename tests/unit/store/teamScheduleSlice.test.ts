import { describe, it, expect } from "vitest";
import { createAppStore } from "@/store/store";
import { teamScheduleActions } from "@/store";
import { AMOUNT_SEASON_GAMES } from "@/src/constants";
import type { TeamSchedule } from "@/types";

const A: TeamSchedule = { team: "A", conference: "c1" };
const B: TeamSchedule = { team: "B", conference: "c1" };
const C: TeamSchedule = { team: "C", conference: "c2" };
const D: TeamSchedule = { team: "D", conference: "c2" };

const game = (weekNumber: string, x: TeamSchedule, y: TeamSchedule) => ({
  weekNumber,
  matchup: [x, y],
});

function configuredStore() {
  const store = createAppStore();
  store.dispatch(
    teamScheduleActions.teamScheduleConfig({
      c1: { A: {}, B: {} },
      c2: { C: {}, D: {} },
    } as never),
  );
  return store;
}

describe("teamScheduleSlice setSeasonSchedule", () => {
  it("appends each game to its week in input order, even when weeks interleave", () => {
    const store = configuredStore();
    store.dispatch(
      teamScheduleActions.setSeasonSchedule([
        game("week1", A, B),
        game("week2", A, C),
        game("week1", C, D),
      ]),
    );
    const weeks = store.getState().teamSchedule.teamSchedules;
    expect(weeks.week1).toEqual([
      [A, B],
      [C, D],
    ]);
    expect(weeks.week2).toEqual([[A, C]]);
    for (let w = 3; w <= AMOUNT_SEASON_GAMES; w++) expect(weeks[`week${w}`]).toEqual([]);
  });

  it("appends to games already in a week", () => {
    const X: TeamSchedule = { team: "X", conference: "c3" };
    const Y: TeamSchedule = { team: "Y", conference: "c3" };
    const store = createAppStore({
      preloadedState: {
        teamSchedule: { teamArray: [], teamSchedules: { week1: [[X, Y]] } },
      },
    });
    store.dispatch(teamScheduleActions.setSeasonSchedule([game("week1", A, B)]));
    expect(store.getState().teamSchedule.teamSchedules.week1).toEqual([
      [X, Y],
      [A, B],
    ]);
  });
});
