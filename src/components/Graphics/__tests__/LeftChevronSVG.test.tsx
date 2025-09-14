import "@testing-library/jest-dom";
import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LeftChevronSVG } from "../LeftChevronSVG";

describe("LeftChevronSVG", () => {
  it("renders without crashing", () => {
    const { container } = render(<LeftChevronSVG />);

    const svg = container.querySelector("svg");

    expect(svg).toBeInTheDocument();
  });
});
