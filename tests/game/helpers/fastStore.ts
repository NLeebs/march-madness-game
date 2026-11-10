import { createAppStore } from "@/store/store";
import type { AppStore, CreateAppStoreOptions } from "@/store/store";

/**
 * createAppStore without Redux Toolkit's dev-only immutability/serializability
 * checks, which walk the whole state on every dispatch (~7 s vs ~0.25 s for the
 * 5,400 schedule dispatches of a 360-team league).
 */
export function createFastStore(options: CreateAppStoreOptions = {}): AppStore {
  return createAppStore({ ...options, devChecks: false });
}
