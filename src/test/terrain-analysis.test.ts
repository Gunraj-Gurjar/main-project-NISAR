import { describe, it, expect } from "vitest";
import {
  analyzeTerrrain,
  DEFAULT_FACTOR_WEIGHTS,
} from "@/lib/terrain-analysis";

describe("Terrain Analysis & Explainability Engine", () => {
  it("should process a synthetic DEM grid and generate valid, explainable outputs", () => {
    // 10x10 synthetic DEM with an incised valley in the center
    const dem: number[][] = Array.from({ length: 10 }, (_, r) =>
      Array.from({ length: 10 }, (_, c) => {
        const distFromCenter = Math.abs(c - 4.5);
        return 500 + distFromCenter * 50 + r * 5;
      })
    );

    const result = analyzeTerrrain(dem);

    expect(result.floodSusceptibility.length).toBe(10);
    expect(result.floodSusceptibility[0].length).toBe(10);

    // Verify all scores are within [0, 1] without NaNs or Infinities
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const score = result.floodSusceptibility[r][c];
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
        expect(Number.isFinite(score)).toBe(true);

        const slope = result.slope[r][c];
        expect(slope).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(slope)).toBe(true);
      }
    }

    // Verify explainable factor breakdowns
    const { susceptibilitySummary } = result.metrics;
    expect(susceptibilitySummary.factorBreakdowns.length).toBe(4);

    const totalContribution = susceptibilitySummary.factorBreakdowns.reduce(
      (sum, f) => sum + f.contributionPct,
      0
    );
    expect(Math.round(totalContribution)).toBe(100);

    // Verify susceptibility zones cover 100% of cells
    const totalZonePct = susceptibilitySummary.zones.reduce(
      (sum, z) => sum + z.percentage,
      0
    );
    expect(Math.round(totalZonePct)).toBe(100);

    const totalCells = susceptibilitySummary.zones.reduce(
      (sum, z) => sum + z.cellCount,
      0
    );
    expect(totalCells).toBe(100);
  });

  it("valley floor cells should have higher flood susceptibility than ridgeline cells", () => {
    const dem: number[][] = [
      [100, 100, 100, 100, 100],
      [100,  50,  20,  50, 100],
      [100,  50,  10,  50, 100],
      [100,  50,  20,  50, 100],
      [100, 100, 100, 100, 100],
    ];

    const result = analyzeTerrrain(dem);
    const valleyCenterScore = result.floodSusceptibility[2][2];
    const ridgeCornerScore = result.floodSusceptibility[0][0];

    // Center depression has much higher predisposition
    expect(valleyCenterScore).toBeGreaterThan(ridgeCornerScore);
  });
});
