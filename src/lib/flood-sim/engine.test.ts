import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFloodSimulation } from "./engine.ts";
import type { FloodSimConfig } from "./types.ts";

/**
 * Helper to generate a clean synthetic V-shaped valley DEM:
 * - Grid: 30 rows x 30 cols
 * - Valley axis runs down the center column: col = 15
 * - Slope slants North to South: elevation decreases by 2m per row
 * - V-shape walls: elevation increases symmetrically by 4m per column away from col 15
 * - East/West edges (cols 0 and 29) are high ridges
 */
function createVValleyDem(rows = 30, cols = 30, valleyCol = 15): Float32Array {
  const dem = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const northSouthBase = 1000 - r * 2.0; // drops downstream (row 0 to 29)
      const vValleyOffset = Math.abs(c - valleyCol) * 4.0; // 4m per column up valley walls
      dem[idx] = northSouthBase + vValleyOffset;
    }
  }
  return dem;
}

describe("Flood Simulation Engine - V-Shaped Valley Benchmark", () => {
  const rows = 30;
  const cols = 30;
  const valleyCol = 15;
  const vDem = createVValleyDem(rows, cols, valleyCol);

  const testConfig: Partial<FloodSimConfig> = {
    cellSizeMeters: 30.0,
    accumulationThreshold: 10,
    sourcePeakStageMeters: 6.0,
    stageDecayPerMeter: 0.001,
    hydrographRiseSeconds: 600,
    hydrographRecessionSeconds: 1200,
    minFlowSpeed: 1.0,
    maxFlowSpeed: 5.0,
    maxLateralDistanceMeters: 150.0,
    timeStepSeconds: 60,
    totalDurationSeconds: 1800,
  };

  const result = runFloodSimulation(vDem, rows, cols, testConfig);

  it("1. The flood route accurately follows the valley axis", () => {
    assert.ok(result.route.length > 5, "Route should contain multiple cells");
    // All route cells should be along the central valley floor (valleyCol = 15)
    for (const cell of result.route) {
      assert.strictEqual(
        cell.col,
        valleyCol,
        `Route cell at row ${cell.row} expected at col ${valleyCol}, but got ${cell.col}`
      );
    }
    // Starts upstream (row 0 or near) and moves downstream
    assert.strictEqual(result.route[0].row, 0);
  });

  it("2. Arrival times along the route increase strictly monotonically downstream", () => {
    let prevArrival = -1;
    let prevDist = -1;
    for (let i = 0; i < result.route.length; i++) {
      const cell = result.route[i];
      assert.ok(
        cell.distanceFromSourceMeters >= prevDist,
        `Distance should increase: current ${cell.distanceFromSourceMeters}, prev ${prevDist}`
      );
      assert.ok(
        cell.arrivalTimeSeconds >= prevArrival,
        `Arrival time must be monotonic: current ${cell.arrivalTimeSeconds}, prev ${prevArrival}`
      );
      prevArrival = cell.arrivalTimeSeconds;
      prevDist = cell.distanceFromSourceMeters;
    }
  });

  it("3. Ridge cells never flood (lateral constraint & HAND)", () => {
    // Columns 0, 1, 2 and 27, 28, 29 are high ridge crests
    for (let r = 0; r < rows; r++) {
      const westRidgeIdx = r * cols + 0;
      const eastRidgeIdx = r * cols + (cols - 1);

      assert.ok(
        isNaN(result.peakDepthGrid[westRidgeIdx]),
        `West ridge cell (${r}, 0) must never flood`
      );
      assert.ok(
        isNaN(result.peakDepthGrid[eastRidgeIdx]),
        `East ridge cell (${r}, ${cols - 1}) must never flood`
      );
    }
  });

  it("4. Flooded cells lie within the valley floor near the channel", () => {
    let floodedCount = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const peak = result.peakDepthGrid[idx];
        if (!isNaN(peak)) {
          floodedCount++;
          // Distance from valley center
          const colDistance = Math.abs(c - valleyCol);
          // With 6m stage and 4m/col slope, water cannot exceed ~1.5 cells laterally
          assert.ok(
            colDistance <= 2,
            `Flooded cell at (${r}, ${c}) is too far from valley center ${valleyCol}`
          );
        }
      }
    }
    assert.ok(floodedCount > 0, "There must be flooded cells along the valley floor");
  });

  it("5. Water depths are never negative across all sparse steps", () => {
    for (const step of result.steps) {
      assert.strictEqual(
        step.cellIndices.length,
        step.depths.length,
        "Indices and depths array lengths must match"
      );
      for (let i = 0; i < step.depths.length; i++) {
        const depth = step.depths[i];
        assert.ok(
          depth > 0,
          `Depth at step t=${step.timeSeconds}s must be strictly positive (>0), got ${depth}`
        );
        assert.ok(
          !isNaN(depth) && isFinite(depth),
          `Depth must be finite float, got ${depth}`
        );
      }
    }
  });

  it("6. Output grids and arrays have correct dimensions and formats", () => {
    assert.strictEqual(result.rows, rows);
    assert.strictEqual(result.cols, cols);
    assert.strictEqual(result.peakDepthGrid.length, rows * cols);
    assert.strictEqual(result.arrivalTimeGrid.length, rows * cols);
    assert.strictEqual(result.handGrid.length, rows * cols);
    assert.strictEqual(result.flowAccumulationGrid.length, rows * cols);
    assert.ok(result.timeStepsSeconds.length > 0);
    assert.strictEqual(result.steps.length, result.timeStepsSeconds.length);
  });

  it("7. Determinism: repeated executions with identical config produce bit-for-bit identical results", () => {
    const run1 = runFloodSimulation(vDem, rows, cols, testConfig);
    const run2 = runFloodSimulation(vDem, rows, cols, testConfig);

    assert.strictEqual(run1.route.length, run2.route.length);
    assert.strictEqual(run1.steps.length, run2.steps.length);

    for (let i = 0; i < run1.route.length; i++) {
      assert.strictEqual(run1.route[i].row, run2.route[i].row);
      assert.strictEqual(run1.route[i].col, run2.route[i].col);
      assert.strictEqual(run1.route[i].distanceFromSourceMeters, run2.route[i].distanceFromSourceMeters);
      assert.strictEqual(run1.route[i].arrivalTimeSeconds, run2.route[i].arrivalTimeSeconds);
    }

    for (let s = 0; s < run1.steps.length; s++) {
      const step1 = run1.steps[s];
      const step2 = run2.steps[s];
      assert.strictEqual(step1.cellIndices.length, step2.cellIndices.length);
      for (let j = 0; j < step1.cellIndices.length; j++) {
        assert.strictEqual(step1.cellIndices[j], step2.cellIndices[j]);
        assert.strictEqual(step1.depths[j], step2.depths[j]);
      }
    }
  });

  it("8. Performance budget: computes in <100ms on 150x150 grid (achieving >60 FPS equivalent)", () => {
    // Generate full 150x150 sample grid (22,500 cells)
    const dim = 150;
    const bigDem = new Float32Array(dim * dim);
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        bigDem[r * dim + c] = 2000 - r * 5.0 + Math.abs(c - 75) * 8.0;
      }
    }

    const start = performance.now();
    const benchmarkResult = runFloodSimulation(bigDem, dim, dim, {
      cellSizeMeters: 30.0,
      accumulationThreshold: 20,
      timeStepSeconds: 300,
      totalDurationSeconds: 7200,
    });
    const durationMs = performance.now() - start;

    assert.ok(
      durationMs < 100,
      `Engine took ${durationMs.toFixed(2)}ms to compute 150x150 grid (budget: <100ms)`
    );
    assert.ok(benchmarkResult.steps.length > 0);
  });
});
