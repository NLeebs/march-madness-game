import { createAppStore } from "@/store";
import type { AppStore, CreateAppStoreOptions } from "@/store";

/**
 * createAppStore without Redux Toolkit's dev-only immutability/serializability
 * checks, which walk the whole state (including the ~5,400-game schedule) on
 * every dispatch, so full-game tests are slow with them on.
 */
export function createFastStore(options: CreateAppStoreOptions = {}): AppStore {
  return createAppStore({ ...options, devChecks: false });
}
