import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAllowedOrigins } from "@/utils/api/allowedOrigins";

const ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_STAGING_URL",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
] as const;

describe("getAllowedOrigins", () => {
  beforeEach(() => {
    ENV_KEYS.forEach((key) => vi.stubEnv(key, ""));
    vi.stubEnv("NODE_ENV", "test");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("adds the deployment and branch hosts", () => {
    vi.stubEnv("VERCEL_URL", "app-abc.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "app-git-x.vercel.app");

    const origins = getAllowedOrigins();

    expect(origins).toContain("https://app-abc.vercel.app");
    expect(origins).toContain("https://app-git-x.vercel.app");
  });

  it("normalizes to origins", () => {
    vi.stubEnv("NODE_ENV", "production");

    const origins = getAllowedOrigins();

    expect(origins).toContain("https://madnessgame.app");
    expect(origins).toContain("https://www.madnessgame.app");
    origins.forEach((origin) => expect(origin.endsWith("/")).toBe(false));
  });

  it("skips values that are not URLs", () => {
    const before = getAllowedOrigins().length;
    vi.stubEnv("NEXT_PUBLIC_STAGING_URL", "not a url");

    expect(() => getAllowedOrigins()).not.toThrow();
    expect(getAllowedOrigins()).toHaveLength(before);
  });

  it("has no duplicates", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://madnessgame.app/");

    const origins = getAllowedOrigins();

    expect(origins.filter((o) => o === "https://madnessgame.app")).toHaveLength(1);
  });
});
