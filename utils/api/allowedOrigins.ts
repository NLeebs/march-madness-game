export function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.NODE_ENV === "production") {
    origins.push("https://www.madnessgame.app/");
    origins.push("https://madnessgame.app/");
  }

  if (process.env.NEXT_PUBLIC_STAGING_URL) {
    origins.push(process.env.NEXT_PUBLIC_STAGING_URL);
  }

  return origins;
}

export function getAllowedOriginsString(): string {
  const origins = getAllowedOrigins();
  return origins.length > 0 ? origins.join(", ") : "*";
}
