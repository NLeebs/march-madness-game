import { afterEach, describe, expect, it } from "vitest";
import { createAppStore } from "@/store/store";
import { exposeStoreForE2e } from "@/src/utils/exposeStoreForE2e";

describe("exposeStoreForE2e", () => {
  const store = createAppStore();

  afterEach(() => {
    delete window.__MADNESS_E2E__;
  });

  it("exposes getState on window when enabled", () => {
    exposeStoreForE2e(store, true);
    expect(window.__MADNESS_E2E__?.getState()).toBe(store.getState());
  });

  it("does nothing when disabled", () => {
    delete window.__MADNESS_E2E__;
    exposeStoreForE2e(store, false);
    expect(window.__MADNESS_E2E__).toBeUndefined();
  });
});
