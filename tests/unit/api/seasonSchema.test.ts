import { describe, it, expect } from "vitest";
import { SeasonRequestSchema } from "@/app/api/season/schema";

const YEAR_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("SeasonRequestSchema", () => {
  it("accepts a uuid", () => {
    expect(SeasonRequestSchema.safeParse({ yearId: YEAR_ID }).success).toBe(true);
  });
  it("rejects extra keys", () => {
    expect(
      SeasonRequestSchema.safeParse({ yearId: YEAR_ID, extra: 1 }).success
    ).toBe(false);
  });
  it("rejects a non-uuid", () => {
    expect(SeasonRequestSchema.safeParse({ yearId: "2024" }).success).toBe(false);
  });
});
