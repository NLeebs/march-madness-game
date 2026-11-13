import "@testing-library/jest-dom";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// The last-resort screen must work when the app's own modules fail to load,
// e.g. a deploy missing NEXT_PUBLIC_SUPABASE_* (supabaseClient throws on import).
vi.mock("@/infrastructure/db/supabaseClient", () => {
  throw new Error("supabase env missing");
});

describe("app/global-error.tsx", () => {
  it("renders without loading the Supabase client", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { default: GlobalError } = await import("@/app/global-error");
    render(<GlobalError error={new Error("layout boom")} reset={() => {}} />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  });
});
