import { createAppStore } from "@/store";
import type { AppStore, CreateAppStoreOptions } from "@/store";

/**
 * createAppStore without Redux Toolkit's dev-only immutability/serializability
 * checks, which walk the whole state on every dispatch. Season play (one
 * `addRegularSeasonGameResult` per game) is still slow with them on.
 */
export function createFastStore(options: CreateAppStoreOptions = {}): AppStore {
  return createAppStore({ ...options, devChecks: false });
}
