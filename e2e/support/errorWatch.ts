import type { Page } from "@playwright/test";

export type ErrorWatch = {
  allow(pattern: RegExp, reason: string): void;
  assertClean(): void;
};

const ERROR_TOAST = '[data-sonner-toaster] [data-type="error"]';

/** Collects console errors and uncaught page errors. */
export function watchForErrors(page: Page): ErrorWatch {
  const seen: string[] = [];
  const allowed: { pattern: RegExp; reason: string }[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") seen.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    seen.push(`pageerror: ${err.message}`);
  });

  return {
    allow(pattern, reason) {
      allowed.push({ pattern, reason });
    },
    assertClean() {
      const problems = seen.filter(
        (entry) => !allowed.some(({ pattern }) => pattern.test(entry)),
      );
      if (problems.length > 0) {
        throw new Error(`Unexpected browser errors:\n${problems.join("\n")}`);
      }
    },
  };
}

/** Error toasts on screen right now (inert until a Toaster is mounted). */
export async function countErrorToasts(page: Page): Promise<number> {
  if (page.isClosed()) return 0;
  return page.locator(ERROR_TOAST).count();
}
