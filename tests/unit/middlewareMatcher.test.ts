import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/supabase", () => ({ refreshSupabaseSession: vi.fn() }));

import { config } from "@/middleware";

// Next.js anchors each matcher pattern to the whole pathname.
const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("middleware matcher", () => {
  it("skips the Sentry tunnel route", () => {
    expect(matcher.test("/monitoring")).toBe(false);
    expect(matcher.test("/monitoring?o=1&p=2")).toBe(false);
  });

  it("still runs on pages", () => {
    expect(matcher.test("/")).toBe(true);
    expect(matcher.test("/dashboard")).toBe(true);
  });
});
