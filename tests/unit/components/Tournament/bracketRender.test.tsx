/**
 * Render pin for the bracket components (Tournament, TournamentRound, RoundSelectBanner /
 * RoundSelectButton): every column's test id, classes and framer-motion animate targets,
 * in DOM order, across the breakpoint edges, selected rounds and tournament phases.
 *
 * Written before the step 10b decomposition. The refactor commits did not change it. Intended
 * updates so far (DIAGNOSIS has the details):
 * - step 10b, finding 44: the w=2350 entries (2350 takes the narrow layout);
 * - step 10c, finding 58: the w=2040 entries (final-four spacing);
 * - step 10c, finding 46: every narrow entry (the centred wrapper became wide-only);
 * - step 10c, finding 47: the narrow entries (actions above the grid, bracket-scroll wrapper);
 * - step 10c review: the w=2351 entries (one wrapper in both layouts);
 * - step 10c review: every recap entry (See Recap and Play Again in their own wrapper; on
 *   narrow, an invisible actions copy in the finals cell).
 * Update the snapshot only for an intended visual change.
 */
import React from "react";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";
import { appStateActions, tournamentActions, uiStateActions } from "@/store";
import type { AppStore } from "@/store";
import type { TournamentRound } from "@/types";
import { Tournament } from "@/src/components/Tournament/Tournament";
import { RoundSelectBanner } from "@/src/components/Tournament/RoundSelectBanner";
import { fieldStore } from "@/tests/game/helpers/fieldStore";
import { pickChalk, playTournament } from "@/tests/game/helpers/runGame";
import { createFastStore } from "@/tests/game/helpers/fastStore";
import { mulberry32, seedMathRandom } from "@/tests/game/helpers/rng";
import { renderWithStore } from "@/tests/game/helpers/renderWithStore";

const MOTION_ONLY_PROPS = new Set([
  "initial",
  "animate",
  "transition",
  "exit",
  "variants",
  "layout",
  "whileHover",
  "whileTap",
]);

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const cache = new Map<string, React.ElementType>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          const Component = React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
            const rest: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(props)) {
              if (!MOTION_ONLY_PROPS.has(key)) rest[key] = value;
            }
            return React.createElement(tag, {
              ...rest,
              ref,
              "data-animate": props.animate === undefined ? undefined : JSON.stringify(props.animate),
            });
          });
          cache.set(tag, Component);
        }
        return cache.get(tag);
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock("@/src/components/Tournament/TournamentMatchup", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/src/components/Tournament/TournamentMatchup")>();
  return {
    ...original,
    TournamentMatchup: ({ round, region, index }: { round: string | number; region: string; index: number }) => (
      <i data-matchup={`${round}:${region}:${index}`} />
    ),
  };
});
vi.mock("@/src/components/UI/PlayTournamentButton", () => ({
  PlayTournamentButton: () => <i data-stub="PlayTournamentButton" />,
}));
vi.mock("@/src/components/Tournament/PlayerScore", () => ({
  PlayerScore: () => <i data-stub="PlayerScore" />,
}));
vi.mock("@/src/components/General/RestartGameButton", () => ({
  RestartGameButton: () => <i data-stub="RestartGameButton" />,
}));
vi.mock("@/src/components/UI/PingNotification", () => ({
  PingNotification: () => <i data-stub="PingNotification" />,
}));

afterEach(() => cleanup());

/**
 * One line per element in document order; runs of stubbed matchups collapse to one line,
 * and so does any element whose test id is in `collapse` (its subtree is pinned elsewhere).
 */
function describeTree(root: Element, collapse: readonly string[] = []): string {
  const lines: string[] = [];
  const walk = (el: Element, depth: number) => {
    const children = Array.from(el.children);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const indent = "  ".repeat(depth);
      const matchup = child.getAttribute("data-matchup");
      if (matchup !== null) {
        let n = 1;
        while (children[i + n]?.hasAttribute("data-matchup")) n++;
        lines.push(`${indent}matchups[${matchup} x${n}]`);
        i += n - 1;
        continue;
      }
      const parts = [child.tagName.toLowerCase()];
      const testId = child.getAttribute("data-testid");
      if (testId) parts.push(`testid=${testId}`);
      const stub = child.getAttribute("data-stub");
      if (stub) parts.push(`stub=${stub}`);
      const cls = (child.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).join(" ");
      if (cls) parts.push(`class="${cls}"`);
      const animate = child.getAttribute("data-animate");
      if (animate) parts.push(`animate=${animate}`);
      const ownText = Array.from(child.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent?.trim())
        .filter(Boolean)
        .join(" ");
      if (ownText) parts.push(`text="${ownText}"`);
      lines.push(indent + parts.join(" "));
      if (testId && collapse.includes(testId)) continue;
      walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return "\n" + lines.join("\n") + "\n";
}

const ROUNDS: TournamentRound[] = [1, 2, "sweet sixteen", "elite eight", "final four", "finals", "champion"];
const BRACKET_WIDTHS = [390, 768, 769, 1024, 1025, 1400, 1401, 1700, 1701, 2040, 2041, 2349, 2350, 2351];
const BANNER_WIDTHS = [390, 768, 769, 1024, 1025, 1400, 1401, 1700, 1701, 2040, 2041];

type Phase = "selection" | "recap";
type BaseState = ReturnType<AppStore["getState"]>;

/**
 * Base states, built once: the pick stage without picks, the pick stage with chalk
 * picks, and a finished tournament (chalk picks, seeded simulation, full replay).
 * Math.random is seeded while building so the field and results never change.
 */
const base: Record<"empty" | "selection" | "recap", BaseState> = {} as Record<
  "empty" | "selection" | "recap",
  BaseState
>;

beforeAll(async () => {
  const seeded = seedMathRandom(10);
  try {
    const pickStage = () => {
      const { store } = fieldStore(1);
      store.dispatch(appStateActions.activateTournament());
      store.dispatch(appStateActions.activateTournamentSelectionStage());
      store.dispatch(tournamentActions.setRoundOneMatchups());
      return store;
    };
    const empty = pickStage();
    base.empty = empty.getState();
    const chalk = pickStage();
    pickChalk(chalk);
    base.selection = chalk.getState();
    const played = fieldStore(1).store;
    await playTournament(played, mulberry32(10));
    base.recap = played.getState();
  } finally {
    seeded.restore();
  }
  cleanup();
});

function storeFrom(state: BaseState): AppStore {
  return createFastStore({ preloadedState: state });
}

function setView(store: AppStore, screenWidth: number, round: TournamentRound) {
  store.dispatch(uiStateActions.screenSize({ screenWidth, screenHeight: 900 }));
  store.dispatch(uiStateActions.selectRound({ newRound: round }));
}

describe("Tournament render pin", () => {
  const cases = (["selection", "recap"] as Phase[]).flatMap((phase) =>
    BRACKET_WIDTHS.flatMap((w) => ROUNDS.map((sel) => [phase, w, sel] as const)),
  );

  it.each(cases)("%s w=%i sel=%s", async (phase, w, sel) => {
    const store = storeFrom(base[phase]);
    setView(store, w, sel);
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = renderWithStore(<Tournament />, store));
    });
    // the banner's own cases below pin its contents
    expect(describeTree(container, ["round-select-banner"])).toMatchSnapshot();
  });
});

describe("Tournament narrow pick stage", () => {
  // Finding 47 moved the post-tournament actions above the grid on narrow screens. Until the
  // tournament starts, the finals cell keeps its (empty) actions block, so its height and the
  // rows it spans stay as they were.
  it.each(["finals", "final four", 1] as TournamentRound[])("keeps the actions block in the finals cell (sel=%s)", async (sel) => {
    const store = storeFrom(base.selection);
    setView(store, 390, sel);
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = renderWithStore(<Tournament />, store));
    });
    const finalsCell = container.querySelector('[data-testid="bracket-column-finals"]')?.parentElement;
    expect(finalsCell?.querySelector('[data-testid="tournament-actions"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="tournament-actions"]')).toHaveLength(1);
  });
});

describe("Tournament narrow after the start", () => {
  // Mid-replay: the results are stored and replaying, the recap not reached yet.
  const replayState = (): BaseState => ({
    ...base.recap,
    appState: { ...base.recap.appState, tournamentRecap: false },
  });
  const phases: [string, () => BaseState][] = [
    ["replay", replayState],
    ["recap", () => base.recap],
  ];
  const cases = phases.flatMap(([name, state]) =>
    (["finals", "final four", 1] as TournamentRound[]).map((sel) => [name, sel, state] as const),
  );

  // The visible actions block sits above the grid; the finals cell keeps an invisible copy, so
  // its height and the rows it spans don't change when the block moves out (step 10c review).
  it.each(cases)("%s sel=%s: one visible actions block above the grid, a hidden copy in the finals cell", async (_name, sel, state) => {
    const store = storeFrom(state());
    setView(store, 390, sel);
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = renderWithStore(<Tournament />, store));
    });
    const actions = container.querySelectorAll('[data-testid="tournament-actions"]');
    expect(actions).toHaveLength(1);
    expect(actions[0].parentElement?.getAttribute("data-testid")).toBe("bracket-scroll");

    const finalsCell = container.querySelector('[data-testid="bracket-column-finals"]')?.parentElement;
    const placeholder = finalsCell?.querySelector('[data-actions-placeholder]');
    expect(placeholder).not.toBeNull();
    expect(placeholder?.getAttribute("aria-hidden")).toBe("true");
    expect(placeholder?.classList.contains("invisible")).toBe(true);
    expect(placeholder?.querySelector('[data-stub="PlayerScore"]')).not.toBeNull();
    expect(placeholder?.querySelector('[data-stub="RestartGameButton"]')).not.toBeNull();
  });

  // See Recap and Play Again take their space from the start of the replay, hidden until the
  // recap, so the block doesn't grow (and push the bracket down) when the tournament ends.
  it.each(phases)("%s: the recap buttons are laid out, hidden until the recap", async (name, state) => {
    const store = storeFrom(state());
    setView(store, 390, "finals");
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = renderWithStore(<Tournament />, store));
    });
    const actions = container.querySelector('[data-testid="tournament-actions"]');
    const restart = actions?.querySelector('[data-stub="RestartGameButton"]');
    expect(restart).not.toBeNull();
    const buttons = restart!.parentElement!;
    const hidden = name === "replay";
    expect(buttons.classList.contains("invisible")).toBe(hidden);
    expect(buttons.getAttribute("aria-hidden")).toBe(hidden ? "true" : null);
  });
});

describe("Tournament across the break point", () => {
  // Crossing TOURNAMENT_BREAK_POINT must not remount the bracket: PlayTournamentButton holds the
  // pending tournament request (useMutation), and a remount drops its result and re-enables it.
  it.each([
    [2400, 2350],
    [2350, 2400],
  ])("keeps the same bracket nodes from w=%i to w=%i", async (from, to) => {
    const store = storeFrom(base.selection);
    setView(store, from, 1);
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = renderWithStore(<Tournament />, store));
    });
    const finals = container.querySelector('[data-testid="bracket-column-finals"]');
    const button = container.querySelector('[data-stub="PlayTournamentButton"]');
    expect(finals).not.toBeNull();
    expect(button).not.toBeNull();
    await act(async () => {
      store.dispatch(uiStateActions.screenSize({ screenWidth: to, screenHeight: 900 }));
    });
    expect(container.querySelector('[data-testid="bracket-column-finals"]')).toBe(finals);
    expect(container.querySelector('[data-stub="PlayTournamentButton"]')).toBe(button);
  });
});

describe("RoundSelectBanner render pin", () => {
  const cases = (["none", "chalk"] as const).flatMap((picks) =>
    BANNER_WIDTHS.flatMap((w) => ROUNDS.map((sel) => [picks, w, sel] as const)),
  );

  it.each(cases)("picks=%s w=%i sel=%s", async (picks, w, sel) => {
    const store = storeFrom(picks === "chalk" ? base.selection : base.empty);
    setView(store, w, sel);
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = renderWithStore(<RoundSelectBanner />, store));
    });
    expect(describeTree(container)).toMatchSnapshot();
  });
});

describe("Tournament at the break point", () => {
  // At exactly TOURNAMENT_BREAK_POINT the bracket is narrow, so it needs the narrow
  // view's round-select banner and play-in column, like one pixel narrower.
  it.each(ROUNDS)("w=2350 renders like w=2349 (sel=%s)", async (sel) => {
    const render = async (w: number) => {
      const store = storeFrom(base.selection);
      setView(store, w, sel);
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = renderWithStore(<Tournament />, store));
      });
      const tree = describeTree(container, ["round-select-banner"]);
      cleanup();
      return tree;
    };
    expect(await render(2350)).toBe(await render(2349));
  });
});
