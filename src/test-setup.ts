import { beforeAll } from "vitest";

// Suppress React act() warnings globally
beforeAll(() => {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: An update to") &&
      args[0].includes("inside a test was not wrapped in act")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});
