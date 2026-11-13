/**
 * Reads the anonymous player id without creating one (unlike getAnonUserId,
 * which writes a new id and throws when the env var is unset). Never throws.
 */
export function readAnonUserId(): string | undefined {
  try {
    const key = process.env.NEXT_PUBLIC_BROWSER_ANON_KEY;
    if (!key) return undefined;
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}
