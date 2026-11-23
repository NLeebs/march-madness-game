/** `value` as a URL origin (scheme, host, port; no path or trailing slash), or null if it isn't a URL. */
export function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
