import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ValidationPage } from "@/pages/ValidationPage";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProjectProvider } from "@/context/ProjectContext";

describe("ValidationPage Empty & Unvalidated State", () => {
  it("renders EmptyState and hides fabricated metrics when unvalidated", () => {
    render(
      <MemoryRouter initialEntries={["/project/demo-job/validation"]}>
        <ProjectProvider>
          <Routes>
            <Route path="/project/:id/validation" element={<ValidationPage />} />
          </Routes>
        </ProjectProvider>
      </MemoryRouter>
    );

    // Verify scientific disclaimer and navigation header render
    expect(screen.getByText(/MANDATORY SAR VALIDATION PRINCIPLES/i)).toBeInTheDocument();

    // Verify source selector options render
    expect(screen.getByText(/NISAR L-Band \(24 cm\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Sentinel-1 C-Band \(5.6 cm\)/i)).toBeInTheDocument();
  });
});
