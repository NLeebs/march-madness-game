import "@testing-library/jest-dom";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CrashScreen } from "../CrashScreen";

const assign = vi.fn();
const originalLocation = window.location;

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  assign.mockReset();
});

describe("CrashScreen", () => {
  it("shows the crash message and the given button text", () => {
    render(<CrashScreen buttonText="Back to home" />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(
      screen.getByText("Sorry about that. We've been notified and will look into it.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to home" })).toBeInTheDocument();
  });

  it("does a full page load of / when the button is clicked", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign },
    });
    render(<CrashScreen buttonText="Start a new game" />);
    fireEvent.click(screen.getByRole("button", { name: "Start a new game" }));
    expect(assign).toHaveBeenCalledWith("/");
  });
});
