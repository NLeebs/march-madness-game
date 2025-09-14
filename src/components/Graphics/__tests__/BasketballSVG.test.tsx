import "@testing-library/jest-dom";
import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BasketballSVG } from "../BasketballSVG";

describe("BasketballSVG", () => {
  const defaultProps = {
    size: 100,
    seamColor: "#8B4513",
    basketballColor: "#FF6B35",
  };

  it("renders without crashing", () => {
    const { container } = render(<BasketballSVG {...defaultProps} />);

    const svg = container.querySelector("svg");

    expect(svg).toBeInTheDocument();
  });

  it("applies correct size props to SVG element", () => {
    const { container } = render(<BasketballSVG {...defaultProps} />);

    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("width", "100");
    expect(svg).toHaveAttribute("height", "100");
  });

  it("applies custom size when provided", () => {
    const customSize = 200;
    const { container } = render(
      <BasketballSVG {...defaultProps} size={customSize} />
    );

    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("width", "200");
    expect(svg).toHaveAttribute("height", "200");
  });

  it("renders ellipse with correct seam color", () => {
    const { container } = render(<BasketballSVG {...defaultProps} />);

    const ellipse = container.querySelector("ellipse");

    expect(ellipse).toHaveAttribute("fill", "#8B4513");
  });

  it("renders basketball paths with correct basketball color", () => {
    const { container } = render(<BasketballSVG {...defaultProps} />);

    const group = container.querySelector("g");

    expect(group).toHaveAttribute("fill", "#FF6B35");
  });

  it("applies custom colors correctly", () => {
    const customProps = {
      size: 150,
      seamColor: "#FF0000",
      basketballColor: "#00FF00",
    };
    const { container } = render(<BasketballSVG {...customProps} />);

    const ellipse = container.querySelector("ellipse");
    const group = container.querySelector("g");

    expect(ellipse).toHaveAttribute("fill", "#FF0000");
    expect(group).toHaveAttribute("fill", "#00FF00");
  });
});
