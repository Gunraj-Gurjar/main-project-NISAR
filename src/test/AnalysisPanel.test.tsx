import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AnalysisPanel from "@/components/AnalysisPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ExplainResponse } from "@/lib/api";

describe("AnalysisPanel Component (Explain Panel)", () => {
  const mockExplainResponse: ExplainResponse = {
    class: "High",
    score: 0.68,
    contributions: [
      {
        factor: "Relative Elevation",
        description: "Morphological lowland depression (12m above sink)",
        raw_value: 12.4,
        normalized_score: 0.78,
        weight: 0.35,
        contribution_percentage: 40,
      },
      {
        factor: "Slope Flatness",
        description: "Flat topography (1.8 deg) restricting runoff velocity",
        raw_value: 1.8,
        normalized_score: 0.70,
        weight: 0.30,
        contribution_percentage: 31,
      },
    ],
    summary: "Point is classified as High Susceptibility (0.68) primarily driven by relative elevation.",
    limitations: "Terrain predisposition screening only. Does not predict real-time flood timing.",
  };

  const mockJobData: any = {
    job_id: "test-job-123",
    status: "done",
    progress: 100,
    output_layers: ["susceptibility"],
    created_at: new Date().toISOString(),
  };

  it("renders location explainability details given a mock /explain response", () => {
    render(
      <TooltipProvider>
        <AnalysisPanel
          jobId="test-job-123"
          jobData={mockJobData}
          explainData={mockExplainResponse}
          loadingExplain={false}
        />
      </TooltipProvider>
    );

    expect(screen.getByText("Point Inspector Analysis")).toBeInTheDocument();
    expect(screen.getByText("High (0.68)")).toBeInTheDocument();
    expect(screen.getByText(mockExplainResponse.summary)).toBeInTheDocument();
    expect(screen.getByText("Relative Elevation")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("renders prompt when no point explanation data is passed", () => {
    render(
      <TooltipProvider>
        <AnalysisPanel
          jobId="test-job-123"
          jobData={mockJobData}
          explainData={null}
          loadingExplain={false}
        />
      </TooltipProvider>
    );

    expect(screen.getByText("No Location Selected")).toBeInTheDocument();
  });
});
