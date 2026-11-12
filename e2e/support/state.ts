import type { Page } from "@playwright/test";
import type { RootState } from "@/store/store";

/** Reads a snapshot of the Redux state exposed by `exposeStoreForE2e` (needs NEXT_PUBLIC_E2E=1). */
export async function readState(page: Page): Promise<RootState> {
  const state = await page.evaluate(() =>
    window.__MADNESS_E2E__ ? window.__MADNESS_E2E__.getState() : null
  );
  if (state === null) {
    throw new Error(
      "window.__MADNESS_E2E__ is missing: build the app with NEXT_PUBLIC_E2E=1 and load a page first."
    );
  }
  return state as RootState;
}
