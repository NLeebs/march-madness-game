import "@testing-library/jest-dom";
import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { createAppStore } from "@/store/store";
import { AuthContext } from "@/src/components/Context/AuthProvider";

vi.mock("@/src/utils/crashReporting", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/utils/crashReporting")>();
  return {
    ...actual,
    reportCrash: vi.fn(),
    summarizeGameState: vi.fn(actual.summarizeGameState),
  };
});

import { reportCrash, summarizeGameState } from "@/src/utils/crashReporting";
import { GameErrorBoundary } from "../GameErrorBoundary";

function ThrowsInRender(): JSX.Element {
  throw new Error("render boom");
}

function ThrowsInEffect(): JSX.Element {
  useEffect(() => {
    throw new Error("effect boom");
  }, []);
  return <p>effect child</p>;
}

function renderBoundary(children: React.ReactNode) {
  const authValue = { user: { id: "u1" }, loading: false } as unknown as null;
  return render(
    <Provider store={createAppStore()}>
      <AuthContext.Provider value={authValue}>
        <GameErrorBoundary>{children}</GameErrorBoundary>
      </AuthContext.Provider>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.mocked(console.error).mockRestore();
});

describe("GameErrorBoundary", () => {
  it("shows the crash screen and reports a render error with game context", () => {
    renderBoundary(<ThrowsInRender />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start a new game" })).toBeInTheDocument();
    expect(reportCrash).toHaveBeenCalledTimes(1);
    expect(reportCrash).toHaveBeenCalledWith(
      expect.objectContaining({ message: "render boom" }),
      expect.objectContaining({
        boundary: "game",
        userId: "u1",
        game: expect.objectContaining({
          activeFlags: expect.arrayContaining(["startScreen"]),
        }),
      })
    );
  });

  it("catches an error thrown in an effect", () => {
    renderBoundary(<ThrowsInEffect />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(reportCrash).toHaveBeenCalledWith(
      expect.objectContaining({ message: "effect boom" }),
      expect.objectContaining({ boundary: "game" })
    );
  });

  it("catches a crash in a sibling before the game (the navigation bar)", () => {
    renderBoundary(
      <>
        <ThrowsInRender />
        <p>game</p>
      </>
    );
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.queryByText("game")).not.toBeInTheDocument();
  });

  it("still shows the crash screen, and keeps the user id, when the game summary throws", () => {
    vi.mocked(summarizeGameState).mockImplementationOnce(() => {
      throw new Error("bad state");
    });
    renderBoundary(<ThrowsInRender />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(reportCrash).toHaveBeenCalledWith(
      expect.objectContaining({ message: "render boom" }),
      { boundary: "game", userId: "u1", anonUserId: undefined }
    );
  });

  it("renders children and reports nothing when nothing throws", () => {
    renderBoundary(<p>all good</p>);
    expect(screen.getByText("all good")).toBeInTheDocument();
    expect(reportCrash).not.toHaveBeenCalled();
  });
});
