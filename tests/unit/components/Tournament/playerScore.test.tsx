import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { createAppStore } from "@/store";
import { PlayerScore } from "@/src/components/Tournament/PlayerScore";
import { renderWithStore } from "@/tests/game/helpers/renderWithStore";

afterEach(() => cleanup());

describe("PlayerScore", () => {
  it("marks the score value with its test id", () => {
    const { container } = renderWithStore(<PlayerScore />, createAppStore());
    expect(container.querySelectorAll('[data-testid="player-score-value"]')).toHaveLength(1);
  });

  // The narrow finals cell keeps an invisible copy of the actions block; it must not add a
  // second player-score-value for tests (and tools) to find.
  it("leaves the test id off a placeholder copy", () => {
    const { container } = renderWithStore(<PlayerScore placeholder />, createAppStore());
    expect(container.querySelector("[data-testid]")).toBeNull();
    expect(container.textContent).toContain("Score");
  });
});
