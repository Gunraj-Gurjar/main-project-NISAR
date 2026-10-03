import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MetricCard } from "@/components/shared/MetricCard";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("MetricCard Component", () => {
  it("renders metric title and formatted numeric value correctly", () => {
    render(
      <TooltipProvider>
        <MetricCard
          title="High/Very High Risk"
          value="24.5%"
          subtext="Terrain area predisposed to ponding"
        />
      </TooltipProvider>
    );

    expect(screen.getByText("High/Very High Risk")).toBeInTheDocument();
    expect(screen.getByText("24.5%")).toBeInTheDocument();
    expect(screen.getByText("Terrain area predisposed to ponding")).toBeInTheDocument();
  });

  it("renders tooltip button when tooltip prop is provided", () => {
    render(
      <TooltipProvider>
        <MetricCard
          title="DEM Resolution"
          value="10m x 10m"
          tooltip="Spatial grid resolution of DEM raster"
        />
      </TooltipProvider>
    );

    const infoButton = screen.getByRole("button", { name: /Information about DEM Resolution/i });
    expect(infoButton).toBeInTheDocument();
  });
});
