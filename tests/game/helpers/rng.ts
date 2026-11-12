import { vi } from "vitest";
import { mulberry32 } from "./mulberry32";

export { mulberry32 };

/** Replaces Math.random with a seeded generator. */
export function seedMathRandom(seed: number): {
  calls: () => number;
  restore: () => void;
} {
  const spy = vi.spyOn(Math, "random").mockImplementation(mulberry32(seed));
  return {
    calls: () => spy.mock.calls.length,
    restore: () => spy.mockRestore(),
  };
}
