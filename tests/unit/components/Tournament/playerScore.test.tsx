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
});
