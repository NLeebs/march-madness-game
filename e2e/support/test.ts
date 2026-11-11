import { test as base, expect } from "@playwright/test";
import {
  installFakeBackend,
  type FakeBackend,
  type FakeBackendOptions,
} from "./fakeBackend";
import { GamePage } from "./game";
import { watchForErrors, countErrorToasts, type ErrorWatch } from "./errorWatch";

export const test = base.extend<{
  backendOptions: FakeBackendOptions;
  backend: FakeBackend;
  errors: ErrorWatch;
  game: GamePage;
}>({
  game: async ({ page }, use) => {
    await use(new GamePage(page));
  },
  /** Override per file or describe with test.use({ backendOptions: {...} }). */
  backendOptions: [{}, { option: true }],
  backend: [
    async ({ page, backendOptions }, use) => {
      const backend = await installFakeBackend(page, backendOptions);
      await use(backend);
      expect(backend.unhandled, "unhandled /api requests").toEqual([]);
    },
    { auto: true },
  ],
  errors: [
    async ({ page }, use) => {
      const errors = watchForErrors(page);
      await use(errors);
      expect(await countErrorToasts(page), "error toasts on screen").toBe(0);
      errors.assertClean();
    },
    { auto: true },
  ],
});

export { expect };
