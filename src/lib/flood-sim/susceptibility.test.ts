import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFloodSimulation } from "./engine.ts";
import { computeTerrainSusceptibility } from "./susceptibility.ts";
import type { TerrainSusceptibilityConfig } from "./susceptibility-types.ts";

/**
 * Synthetic V-shaped valley DEM:
 * - 30 rows x 30 cols
 * - Valley axis at col 15
 * - Slope slants North to South: 2m drop per row
 * - V-shape walls: 4m per column elevation rise away from col 15
 */
function createVValleyDem(rows = 30, cols = 30, valleyCol = 15): Float32Array {
  const dem = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const northSouthBase = 1000 - r * 2.0;
      const vValleyOffset = Math.abs(c - valleyCol) * 4.0;
      dem[idx] = northSouthBase + vValleyOffset;
    }
  }
  return dem;
}

describe("Static Terrain-Based Flood Susceptibility Layer", () => {
  const rows = 30;
  const cols = 30;
  const valleyCol = 15;
  const cellSizeMeters = 30.0;
  const vDem = createVValleyDem(rows, cols, valleyCol);

  // 1. Run simulation engine to extract topological HAND and accumulation
  const sim = runFloodSimulation(vDem, rows, cols, {
    cellSizeMeters,
    accumulationThreshold: 10,
  });

  // 2. Compute static susceptibility layer
  const susc = computeTerrainSusceptibility(
    vDem,
    sim.handGrid,
    sim.flowAccumulationGrid,
    rows,
    cols,
    cellSizeMeters
  );

  it("1. Correct naming: layer name is 'flood susceptibility (terrain-based)' and never 'hazard' or 'prediction'", () => {
    assert.strictEqual(susc.layerName, "flood susceptibility (terrain-based)");
    assert.ok(!susc.layerName.includes("hazard"));
    assert.ok(!susc.layerName.includes("prediction"));
  });

  it("2. Monotonicity test: lower HAND never decreases the susceptibility score", () => {
    // For identical slope and accumulation, test synthetic pairs with varied HAND
    const testAccumulation = new Int32Array([100, 100]);
    const testHandLower = 5.0;
    const testHandHigher = 25.0;
    const testHand = new Float32Array([testHandLower, testHandHigher]);
    const testDem = new Float32Array([100.0, 100.0]); // equal elevation/flat slope

    const testResult = computeTerrainSusceptibility(
      testDem,
      testHand,
      testAccumulation,
      1,
      2,
      cellSizeMeters
    );

    const scoreLowerHand = testResult.scores[0];
    const scoreHigherHand = testResult.scores[1];

    assert.ok(
      scoreLowerHand >= scoreHigherHand,
      `Lower HAND (${testHandLower}m) produced score ${scoreLowerHand}, which should be >= score ${scoreHigherHand} of higher HAND (${testHandHigher}m)`
    );
  });

  it("3. Valley floor cells have High or Very High susceptibility, while ridge cells do not", () => {
    // Check central valley axis (col 15, rows 5 to 25)
    let valleyHighCount = 0;
    for (let r = 5; r <= 25; r++) {
      const valleyIdx = r * cols + valleyCol;
      const valleyClass = susc.classes[valleyIdx];
      const valleyScore = susc.scores[valleyIdx];

      assert.ok(
        valleyClass === "High" || valleyClass === "Very High",
        `Valley floor cell (${r}, ${valleyCol}) should be High or Very High, got ${valleyClass} (score: ${valleyScore})`
      );
      valleyHighCount++;
    }
    assert.ok(valleyHighCount > 0);

    // Check ridge cells (cols 0, 1 and cols 28, 29)
    for (let r = 0; r < rows; r++) {
      const westRidge = susc.classes[r * cols + 0];
      const eastRidge = susc.classes[r * cols + (cols - 1)];

      assert.ok(
        westRidge === "Low" || westRidge === "Moderate",
        `West ridge at row ${r} should be Low or Moderate, got ${westRidge}`
      );
      assert.notStrictEqual(westRidge, "Very High");

      assert.ok(
        eastRidge === "Low" || eastRidge === "Moderate",
        `East ridge at row ${r} should be Low or Moderate, got ${eastRidge}`
      );
      assert.notStrictEqual(eastRidge, "Very High");
    }
  });

  it("4. Per-cell explainability breakdown works and sums to ~100%", () => {
    const explanation = susc.explainCell(10, valleyCol);
    assert.strictEqual(explanation.row, 10);
    assert.strictEqual(explanation.col, valleyCol);
    assert.ok(explanation.contributions.length === 3);

    let totalPct = 0;
    for (const c of explanation.contributions) {
      assert.ok(c.contributionPercentage >= 0 && c.contributionPercentage <= 100);
      assert.ok(c.normalizedScore >= 0 && c.normalizedScore <= 1);
      assert.ok(c.weight > 0 && c.weight <= 1);
      assert.ok(c.displayName.length > 0);
      assert.ok(c.description.length > 0);
      totalPct += c.contributionPercentage;
    }

    // Sum should be approximately 100% (allowing small rounding tolerance 98-102%)
    assert.ok(
      totalPct >= 98 && totalPct <= 102,
      `Expected total percentage ~100%, got ${totalPct}%`
    );
    assert.ok(explanation.scientificDisclaimer.includes("screening indicator"));
  });

  it("5. Custom weights and thresholds are respected", () => {
    const customConfig: Partial<TerrainSusceptibilityConfig> = {
      weights: { hand: 0.8, slope: 0.1, logAccumulation: 0.1 },
      thresholds: { lowMax: 0.2, moderateMax: 0.4, highMax: 0.7 },
    };

    const customSusc = computeTerrainSusceptibility(
      vDem,
      sim.handGrid,
      sim.flowAccumulationGrid,
      rows,
      cols,
      cellSizeMeters,
      customConfig
    );

    assert.strictEqual(customSusc.config.weights.hand, 0.8);
    assert.strictEqual(customSusc.config.thresholds.highMax, 0.7);
  });
});
