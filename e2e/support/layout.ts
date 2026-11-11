import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import type { TournamentRound } from "@/types";
import { BRACKET_ROUNDS } from "./bracketMap";

/**
 * Checks that a real user could click `locator`: it is visible and enabled, its box is inside
 * the viewport (after scrolling) and nothing else covers its centre. Use it before a
 * `dispatchEvent("click")` on a control whose animation defeats Playwright's stable check.
 */
/**
 * The viewport the project configured. Not `window.innerWidth`: on a mobile-emulated page whose
 * content is wider than the screen, Chrome zooms out and `innerWidth` grows to the content
 * width, so a sideways overflow would measure as "fits".
 */
function viewportOf(page: Page): { width: number; height: number } {
  const size = page.viewportSize();
  if (!size) throw new Error("page has no fixed viewport size");
  return size;
}

export async function assertClickable(locator: Locator, timeout = 15_000): Promise<void> {
  await expect(locator, "control is not visible").toBeVisible({ timeout });
  await expect(locator, "control is not enabled").toBeEnabled({ timeout });
  const viewport = viewportOf(locator.page());
  // Retried until the timeout: a bracket column that is still animating in or out can briefly
  // sit over or off the control, and a player would simply wait for it to settle.
  await expect(async () => {
    const hit = await locator.evaluate((el, vp) => {
      // Not scrollIntoViewIfNeeded: it waits for a stable box, which animated controls never have.
      // scrollIntoView also scrolls overflow-hidden containers, which a player cannot do; put
      // those back so a control parked off to the side of one is reported as out of view
      // (and so the check leaves no hidden scroll offset behind to skew later checks).
      const hiddenScroll: { a: Element; left: number; top: number }[] = [];
      for (let a = el.parentElement; a; a = a.parentElement) {
        const cs = getComputedStyle(a);
        const hidden = (v: string) => v === "hidden" || v === "clip";
        if (hidden(cs.overflowX) || hidden(cs.overflowY)) {
          hiddenScroll.push({ a, left: a.scrollLeft, top: a.scrollTop });
        }
      }
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      for (const { a, left, top } of hiddenScroll) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === "hidden" || cs.overflowX === "clip") a.scrollLeft = left;
        if (cs.overflowY === "hidden" || cs.overflowY === "clip") a.scrollTop = top;
      }
      const box = el.getBoundingClientRect();
      const inViewport =
        box.width > 0 &&
        box.height > 0 &&
        // 1px of slack: boxes in fractional-width layouts overhang the viewport by ~0.4px.
        box.left >= -1 &&
        box.top >= -1 &&
        box.right <= vp.width + 1 &&
        box.bottom <= vp.height + 1;
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      const where = `box left ${box.left.toFixed(1)} right ${box.right.toFixed(1)} top ${box.top.toFixed(1)} bottom ${box.bottom.toFixed(1)}, viewport ${vp.width}x${vp.height}`;
      const cover = top ? `${top.tagName.toLowerCase()}.${String(top.className).replace(/\s+/g, " ").slice(0, 120)}` : "nothing";
      return { inViewport, covered: !top || !(top === el || el.contains(top)), where, cover };
    }, viewport);
    expect(hit.inViewport, `control box is not inside the viewport (${hit.where})`).toBe(true);
    expect(hit.covered, `something covers the centre of the control (${hit.cover}; ${hit.where})`).toBe(false);
  }).toPass({ timeout });
}

/**
 * A control a player could really use: everything `assertClickable` checks, plus a trial click
 * (Playwright's own actionability checks, without clicking). Controls that never stop moving
 * (the bouncing "Go to Tournament") pass `{ animated: true }`: the trial click would wait for
 * a stable box forever, so only the manual checks run.
 */
export async function assertUsable(
  locator: Locator,
  options: { animated?: boolean; timeout?: number } = {},
): Promise<void> {
  const timeout = options.timeout ?? 15_000;
  await assertClickable(locator, timeout);
  if (!options.animated) await locator.click({ trial: true, timeout });
}

export async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const width = viewportOf(page).width;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth, `page scrolls sideways: scrollWidth ${scrollWidth} > viewport ${width}`).toBeLessThanOrEqual(
    width,
  );
}

/** The part of an element that is really on screen, plus the data attributes used to label it. */
type ScreenBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  /** Width and height of the element's own box, before any clipping. */
  fullWidth: number;
  fullHeight: number;
  label: string;
};

/**
 * Boxes of every element matching `selector` that is not `visibility: hidden`, each cut down by
 * every ancestor that clips its overflow (a collapsed bracket column has width 0 and clips its
 * buttons away). Scroll containers do not clip: what they hold can be scrolled to, so along a
 * scrolling axis no clipping further out counts either.
 */
async function onScreenBoxes(page: Page, selector: string): Promise<ScreenBox[]> {
  return page.evaluate((sel) => {
    const clips = (v: string) => v === "hidden" || v === "clip";
    const scrolls = (v: string) => v === "auto" || v === "scroll";
    return Array.from(document.querySelectorAll<HTMLElement>(sel))
      .filter((el) => getComputedStyle(el).visibility !== "hidden")
      .map((el) => {
        const r = el.getBoundingClientRect();
        let { left, right, top, bottom } = r;
        // Once an ancestor scrolls along an axis, the element can be scrolled into view along it,
        // so clipping further out no longer hides it on that axis.
        let xScrollable = false;
        let yScrollable = false;
        for (let a = el.parentElement; a; a = a.parentElement) {
          const cs = getComputedStyle(a);
          const ar = a.getBoundingClientRect();
          if (!xScrollable && clips(cs.overflowX)) {
            left = Math.max(left, ar.left);
            right = Math.min(right, ar.right);
          }
          if (!yScrollable && clips(cs.overflowY)) {
            top = Math.max(top, ar.top);
            bottom = Math.min(bottom, ar.bottom);
          }
          xScrollable = xScrollable || scrolls(cs.overflowX);
          yScrollable = yScrollable || scrolls(cs.overflowY);
        }
        const label =
          `${el.dataset.round}/${el.dataset.region}/${el.dataset.matchup}/${el.dataset.value} ${el.dataset.team ?? ""}`.trim();
        return {
          left,
          right,
          top,
          bottom,
          width: right - left,
          height: bottom - top,
          fullWidth: r.width,
          fullHeight: r.height,
          label,
        };
      });
  }, selector);
}

/** No two visible elements matching `selector` overlap by more than 1px in both directions. */
export async function assertNoOverlap(page: Page, selector: string): Promise<void> {
  const boxes = (await onScreenBoxes(page, selector)).filter((b) => b.width > 0 && b.height > 0);
  const found: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 1 && h > 1) found.push(`${a.label} and ${b.label} overlap by ${w.toFixed(1)}x${h.toFixed(1)}px`);
    }
  }
  expect(boxes.length, `visible elements matching ${selector}`).toBeGreaterThan(0);
  expect(found.slice(0, 5), `overlapping ${selector}`).toEqual([]);
}

/**
 * Every matchup of the round on show is really on screen: the number of `round`'s team buttons
 * whose box is non-empty and not cut by a clipping ancestor (1px slack) equals the round's
 * expected button count (two per game). Retried while columns animate in or out.
 */
export async function assertRoundUnclipped(
  page: Page,
  round: TournamentRound,
  timeout = 15_000,
  context = "",
): Promise<void> {
  const info = BRACKET_ROUNDS.find((r) => r.round === round);
  if (!info) throw new Error(`not a pick round: ${String(round)}`);
  const selector = `button.team-selection[data-round="${String(round)}"]`;
  await expect(async () => {
    const boxes = await onScreenBoxes(page, selector);
    const whole = boxes.filter(
      (b) => b.width > 0 && b.height > 0 && b.width >= b.fullWidth - 1 && b.height >= b.fullHeight - 1,
    );
    const cut = boxes.filter((b) => !whole.includes(b)).map((b) => b.label);
    expect(
      whole.length,
      `${context}${String(round)}: unclipped team buttons at ${viewportOf(page).width}px (clipped or hidden: ${cut.slice(0, 4).join(", ") || "none"})`,
    ).toBe(info.games * 2);
  }).toPass({ timeout });
}

export type LayoutSignature = { bannerVisible: boolean; visibleColumns: string[] };

export async function layoutSignature(page: Page): Promise<LayoutSignature> {
  return page.evaluate(() => {
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const banner = document.querySelector('[data-testid="round-select-banner"]');
    const ids = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="bracket-column-"]'))
      .filter(shown)
      .map((el) => el.dataset.testid as string);
    return { bannerVisible: banner !== null && shown(banner), visibleColumns: Array.from(new Set(ids)).sort() };
  });
}

/**
 * Resolves once the bracket columns, the round banner and the team buttons have kept the same
 * boxes for `frames` animation frames in a row (framer-motion animates column widths after a
 * resize or a round change). A condition wait, not a sleep: it ends as soon as layout is still.
 */
export async function waitForLayoutToSettle(page: Page, frames = 10, timeout = 15_000): Promise<void> {
  await page.evaluate(
    ({ frames: needed, timeout: limit }) =>
      new Promise<void>((resolve, reject) => {
        const sel = '[data-testid^="bracket-column-"], [data-testid="round-select-banner"] button, button.team-selection';
        const snapshot = () =>
          Array.from(document.querySelectorAll(sel))
            .map((el) => {
              const r = el.getBoundingClientRect();
              return `${r.left.toFixed(1)},${r.top.toFixed(1)},${r.width.toFixed(1)},${r.height.toFixed(1)}`;
            })
            .join(";");
        const started = performance.now();
        let last = snapshot();
        let still = 0;
        const tick = () => {
          const now = snapshot();
          still = now === last ? still + 1 : 0;
          last = now;
          if (still >= needed) resolve();
          else if (performance.now() - started > limit) reject(new Error(`layout still moving after ${limit} ms`));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { frames, timeout },
  );
}

/** Layout problems that exist in the app today. Each one is asserted to STILL occur, so a fix forces the entry's removal. */
export type LayoutCheck = "horizontal-scroll" | "overlap" | "round-navigation";
export type KnownLayoutIssue = {
  project: string;
  /** Phase names as passed to `enforceLayout` (GamePage and the resize test use the same names). */
  phases: string[];
  /** Only at this viewport width (the resize test changes width within one project). */
  width?: number;
  check: LayoutCheck;
  description: string;
  finding: string;
};

/** Phases in which the bracket is on screen, as GamePage and the resize test name them. */
const BRACKET_PHASES = ["bracket picks", "bracket complete", "tournament finished", "recap"];

export const KNOWN_LAYOUT_ISSUES: KnownLayoutIssue[] = [
  {
    project: "laptop",
    phases: BRACKET_PHASES,
    width: 2349,
    check: "horizontal-scroll",
    description: "bracket screens scroll sideways between 2326 and 2349px",
    finding:
      "Task 8 resize sweep: at 2349px the page's scrollWidth is 2361. Tournament.tsx wraps the round banner " +
      "and the bracket grid (both w-screen / full width) in `mx-auto max-w-tourny` (2325px). Above 2325px the " +
      "wrapper is narrower than the viewport and centred, so its full-width children start (width - 2325) / 2 px " +
      "in and overhang the right edge by the same amount. Wider than 2350 the grid switches to its wide layout " +
      "and the overhang goes away.",
  },
];

/**
 * Runs a layout check. Where a KNOWN_LAYOUT_ISSUES entry matches the current project, phase,
 * check and (if the entry names one) viewport width, the check must fail (the issue is still there); everywhere else it must pass.
 */
export async function enforceLayout(
  page: Page,
  phase: string,
  check: LayoutCheck,
  run: () => Promise<void>,
): Promise<void> {
  const project = test.info().project.name;
  const viewportWidth = viewportOf(page).width;
  const known = KNOWN_LAYOUT_ISSUES.find(
    (k) =>
      k.project === project &&
      k.phases.includes(phase) &&
      k.check === check &&
      (k.width === undefined || k.width === viewportWidth),
  );
  if (!known) {
    await run();
    return;
  }
  let failure: unknown = null;
  try {
    await run();
  } catch (e) {
    failure = e;
  }
  expect(
    failure,
    `known layout issue no longer occurs (${known.description}); remove it from KNOWN_LAYOUT_ISSUES`,
  ).not.toBeNull();
}
