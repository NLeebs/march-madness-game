import { vi, describe, it, expect, afterEach } from "vitest";
import { numberOfConferences } from "../teamStatURLUtils";

vi.mock("@/src/components/Add-To-Firebase/Team-Stats-URL-Objects", () => ({
  allStatURLsObjects: [
    false,
    {},
    { "team-stats-URL": "https://www.google.com" },
    { "team-stats-URL": "https://www.google.com" },
  ],
}));

describe("teamStatURLUtils", () => {
  it("should return the correct number of conferences", () => {
    expect(numberOfConferences).toBe(2);
  });
});
