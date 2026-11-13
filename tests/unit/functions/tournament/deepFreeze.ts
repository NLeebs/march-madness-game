/** Recursively freezes `value` (in place) and returns it, so tests can prove a function does not mutate its input. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach((child) =>
      deepFreeze(child)
    );
  }
  return value;
}
