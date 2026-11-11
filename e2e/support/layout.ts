import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Checks that a real user could click `locator`: it is visible and enabled, its box is inside
 * the viewport (after scrolling) and nothing else covers its centre. Use it before a
 * `dispatchEvent("click")` on a control whose animation defeats Playwright's stable check.
 */
export async function assertClickable(locator: Locator, timeout = 15_000): Promise<void> {
  await expect(locator, "control is not visible").toBeVisible({ timeout });
  await expect(locator, "control is not enabled").toBeEnabled({ timeout });
  const hit = await locator.evaluate((el) => {
    // Not scrollIntoViewIfNeeded: it waits for a stable box, which animated controls never have.
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    const box = el.getBoundingClientRect();
    const inViewport =
      box.width > 0 &&
      box.height > 0 &&
      box.left >= 0 &&
      box.top >= 0 &&
      box.right <= window.innerWidth &&
      box.bottom <= window.innerHeight;
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return { inViewport, covered: !top || !(top === el || el.contains(top)) };
  });
  expect(hit.inViewport, "control box is not inside the viewport").toBe(true);
  expect(hit.covered, "something covers the centre of the control").toBe(false);
}
