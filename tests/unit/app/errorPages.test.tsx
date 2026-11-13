import "@testing-library/jest-dom";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthContext } from "@/src/components/Context/AuthProvider";

vi.mock("@/src/utils/crashReporting", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/utils/crashReporting")>();
  return { ...actual, reportCrash: vi.fn() };
});

import { reportCrash } from "@/src/utils/crashReporting";
import RouteError from "@/app/error";
import GlobalError from "@/app/global-error";

const reset = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  // React warns about <html> inside the test container for GlobalError.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.mocked(console.error).mockRestore();
});

describe("app/error.tsx", () => {
  it("shows the crash screen with a Back to home button and reports once", () => {
    const error = new Error("route boom");
    render(<RouteError error={error} reset={reset} />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to home" })).toBeInTheDocument();
    expect(reportCrash).toHaveBeenCalledTimes(1);
    expect(reportCrash).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ boundary: "route", userId: undefined })
    );
  });

  it("passes the signed-in user id", () => {
    const error = new Error("route boom");
    const authValue = { user: { id: "u1" }, loading: false } as unknown as null;
    render(
      <AuthContext.Provider value={authValue}>
        <RouteError error={error} reset={reset} />
      </AuthContext.Provider>
    );
    expect(reportCrash).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ boundary: "route", userId: "u1" })
    );
  });

  it("passes the Next.js error digest", () => {
    const error = Object.assign(new Error("route boom"), { digest: "d-123" });
    render(<RouteError error={error} reset={reset} />);
    expect(reportCrash).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ digest: "d-123" })
    );
  });
});

describe("app/global-error.tsx", () => {
  it("shows the crash screen with a Back to home button and reports once", () => {
    const error = Object.assign(new Error("layout boom"), { digest: "d-9" });
    render(<GlobalError error={error} reset={reset} />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to home" })).toBeInTheDocument();
    expect(reportCrash).toHaveBeenCalledTimes(1);
    expect(reportCrash).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ boundary: "global", digest: "d-9" })
    );
  });
});
