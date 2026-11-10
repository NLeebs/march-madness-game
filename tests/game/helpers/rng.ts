import { vi } from "vitest";

/** Small seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
