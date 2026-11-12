import type { AppStore } from "@/store/store";

declare global {
  interface Window {
    __MADNESS_E2E__?: { getState: AppStore["getState"] };
  }
}

/**
 * Exposes a read-only state snapshot getter for Playwright. Next inlines
 * NEXT_PUBLIC_E2E at build time, so production builds compile this out.
 */
export function exposeStoreForE2e(
  store: Pick<AppStore, "getState">,
  enabled: boolean = process.env.NEXT_PUBLIC_E2E === "1"
): void {
  if (!enabled || typeof window === "undefined") return;
  window.__MADNESS_E2E__ = { getState: () => store.getState() };
}
