import "@testing-library/jest-dom";
import React from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, afterEach } from "vitest";
import pythonDataScrapeHandler from "@/src/functions/data-scraping/sendTeamStatsToFirebase";
import { AddTeamStatsToFirebase } from "../AddTeamStatsToFirebase";

vi.mock("@/src/functions/data-scraping/sendTeamStatsToFirebase", () => ({
  __esModule: true,
  default: vi.fn(),
}));

describe("AddTeamStatsToFirebase", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the button with correct label", () => {
    const { getByRole } = render(<AddTeamStatsToFirebase />);

    expect(
      getByRole("button", { name: /add team to fb/i })
    ).toBeInTheDocument();
  });

  it("calls pythonDataScrapeHandler when button is clicked", async () => {
    const { getByRole } = render(<AddTeamStatsToFirebase />);

    const button = getByRole("button", { name: /add team to fb/i });
    await userEvent.click(button);

    expect(pythonDataScrapeHandler).toHaveBeenCalledTimes(1);
  });

  it("is accessible by role and label", () => {
    const { getByRole } = render(<AddTeamStatsToFirebase />);

    expect(getByRole("button", { name: /add team to fb/i })).toBeVisible();
  });
});
