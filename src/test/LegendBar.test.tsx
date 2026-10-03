import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LegendBar, SUSCEPTIBILITY_ZONES } from "@/components/shared/LegendBar";

describe("LegendBar Component", () => {
  it("renders 4-step susceptibility zones: Low, Moderate, High, Very High", () => {
    render(<LegendBar />);

    SUSCEPTIBILITY_ZONES.forEach((zone) => {
      expect(screen.getByText(zone.label)).toBeInTheDocument();
    });
  });

  it("renders custom zone percentage values when provided", () => {
    const percentages = {
      Low: 40,
      Moderate: 35,
      High: 18,
      "Very High": 7,
    };

    render(<LegendBar percentages={percentages} />);

    expect(screen.getByText("40.0%")).toBeInTheDocument();
    expect(screen.getByText("35.0%")).toBeInTheDocument();
    expect(screen.getByText("18.0%")).toBeInTheDocument();
    expect(screen.getByText("7.0%")).toBeInTheDocument();
  });

  it("calls onZoneClick handler when a zone card is clicked", () => {
    const handleClick = vi.fn();
    render(<LegendBar onZoneClick={handleClick} />);

    const highZoneBtn = screen.getByRole("button", { name: /High Score/i });
    fireEvent.click(highZoneBtn);

    expect(handleClick).toHaveBeenCalledWith("High");
  });
});
