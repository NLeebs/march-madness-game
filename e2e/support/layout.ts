import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

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
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
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

/** No two visible elements matching `selector` overlap by more than 1px in both directions. */
export async function assertNoOverlap(page: Page, selector: string): Promise<void> {
  const overlaps = await page.evaluate((sel) => {
    // The part of an element that is really on screen: its box cut down by every ancestor that
    // clips its overflow (a collapsed bracket column has width 0 and clips its buttons away).
    // Scroll containers do not clip: what they hold can be scrolled to.
    const onScreen = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      let { left, right, top, bottom } = r;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const cs = getComputedStyle(a);
        const clips = (v: string) => v === "hidden" || v === "clip";
        const ar = a.getBoundingClientRect();
        if (clips(cs.overflowX)) {
          left = Math.max(left, ar.left);
          right = Math.min(right, ar.right);
        }
        if (clips(cs.overflowY)) {
          top = Math.max(top, ar.top);
          bottom = Math.min(bottom, ar.bottom);
        }
      }
      return { left, right, top, bottom, width: right - left, height: bottom - top };
    };
    const boxes = Array.from(document.querySelectorAll<HTMLElement>(sel))
      .filter((el) => getComputedStyle(el).visibility !== "hidden")
      .map((el) => ({ el, r: onScreen(el) }))
      .filter(({ r }) => r.width > 0 && r.height > 0);
    const label = (el: HTMLElement) =>
      `${el.dataset.round}/${el.dataset.region}/${el.dataset.matchup}/${el.dataset.value} ${el.dataset.team ?? ""}`.trim();
    const found: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].r;
        const b = boxes[j].r;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 1 && h > 1) {
          found.push(`${label(boxes[i].el)} and ${label(boxes[j].el)} overlap by ${w.toFixed(1)}x${h.toFixed(1)}px`);
        }
      }
    }
    return { count: boxes.length, found };
  }, selector);
  expect(overlaps.count, `visible elements matching ${selector}`).toBeGreaterThan(0);
  expect(overlaps.found.slice(0, 5), `overlapping ${selector}`).toEqual([]);
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

/** Layout problems that exist in the app today. Each one is asserted to STILL occur, so a fix forces the entry's removal. */
export type LayoutCheck = "horizontal-scroll" | "overlap";
export type KnownLayoutIssue = {
  project: string;
  phase: string;
  check: LayoutCheck;
  description: string;
  finding: string;
};

export const KNOWN_LAYOUT_ISSUES: KnownLayoutIssue[] = [];

/**
 * Runs a layout check. Where a KNOWN_LAYOUT_ISSUES entry matches the current project, phase and
 * check, the check must fail (the issue is still there); everywhere else it must pass.
 */
export async function enforceLayout(
  phase: string,
  check: LayoutCheck,
  run: () => Promise<void>,
): Promise<void> {
  const project = test.info().project.name;
  const known = KNOWN_LAYOUT_ISSUES.find((k) => k.project === project && k.phase === phase && k.check === check);
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
