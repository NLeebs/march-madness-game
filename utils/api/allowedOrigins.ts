import { toOrigin } from "./toOrigin";

/**
 * Origins allowed to call the game routes: the app URL, the production
 * domains, an optional staging URL, and this deployment's own Vercel hosts
 * (VERCEL_URL, VERCEL_BRANCH_URL; host only, set by Vercel), so a preview
 * can be played on its own link.
 */
export function getAllowedOrigins(): string[] {
  const candidates: string[] = [];

  if (process.env.NEXT_PUBLIC_APP_URL) {
    candidates.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.NODE_ENV === "production") {
    candidates.push("https://www.madnessgame.app");
    candidates.push("https://madnessgame.app");
  }

  if (process.env.NEXT_PUBLIC_STAGING_URL) {
    candidates.push(process.env.NEXT_PUBLIC_STAGING_URL);
  }

  [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].forEach((host) => {
    if (host) candidates.push(`https://${host}`);
  });

  const origins = candidates.map(toOrigin).filter((origin): origin is string => origin !== null);
  return Array.from(new Set(origins));
}

export function getAllowedOriginsString(): string {
  const origins = getAllowedOrigins();
  return origins.length > 0 ? origins.join(", ") : "*";
}
