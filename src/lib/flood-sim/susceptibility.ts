import type {
  TerrainSusceptibilityConfig,
  TerrainSusceptibilityResult,
  SusceptibilityClass,
  CellSusceptibilityExplanation,
  FactorContributionDetail,
} from "./susceptibility-types.ts";
import { DEFAULT_SUSCEPTIBILITY_CONFIG } from "./susceptibility-types.ts";

/**
 * Computes slope in degrees across an isotropic DEM raster (3x3 central differences).
 * dz/dx and dz/dy account for cellSizeMeters.
 */
export function computeSlopeDegrees(
  dem: Float32Array,
  rows: number,
  cols: number,
  cellSizeMeters: number
): Float32Array {
  const slope = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const elev = dem[idx];
      if (isNaN(elev)) {
        slope[idx] = NaN;
        continue;
      }

      // Safe boundary clamps
      const rPrev = Math.max(0, r - 1);
      const rNext = Math.min(rows - 1, r + 1);
      const cPrev = Math.max(0, c - 1);
      const cNext = Math.min(cols - 1, c + 1);

      const dxMeters = (cNext - cPrev) * cellSizeMeters || cellSizeMeters;
      const dyMeters = (rNext - rPrev) * cellSizeMeters || cellSizeMeters;

      const dzdx = (dem[r * cols + cNext] - dem[r * cols + cPrev]) / dxMeters;
      const dzdy = (dem[rNext * cols + c] - dem[rPrev * cols + c]) / dyMeters;

      const grad = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
      slope[idx] = Math.atan(grad) * (180 / Math.PI);
    }
  }
  return slope;
}

/**
 * Computes the static "flood susceptibility (terrain-based)" layer.
 * Strictly adheres to project scientific guardrails:
 * - Uses HAND, slope, and log flow accumulation derived from the engine.
 * - Normalized composite score in [0.0, 1.0].
 * - Classified into Low / Moderate / High / Very High.
 * - Provides per-cell contribution breakdown for explainable AI inspection.
 */
export function computeTerrainSusceptibility(
  dem: Float32Array,
  hand: Float32Array,
  accumulation: Int32Array,
  rows: number,
  cols: number,
  cellSizeMeters: number,
  partialConfig: Partial<TerrainSusceptibilityConfig> = {}
): TerrainSusceptibilityResult {
  const config: TerrainSusceptibilityConfig = {
    ...DEFAULT_SUSCEPTIBILITY_CONFIG,
    ...partialConfig,
    weights: {
      ...DEFAULT_SUSCEPTIBILITY_CONFIG.weights,
      ...(partialConfig.weights || {}),
    },
    thresholds: {
      ...DEFAULT_SUSCEPTIBILITY_CONFIG.thresholds,
      ...(partialConfig.thresholds || {}),
    },
  };

  const n = rows * cols;
  const slope = computeSlopeDegrees(dem, rows, cols, cellSizeMeters);

  // 1. Find dynamic max log accumulation across valid terrain
  let maxLogAcc = 1.0;
  for (let i = 0; i < n; i++) {
    if (!isNaN(dem[i]) && accumulation[i] > 0) {
      const logA = Math.log(accumulation[i]);
      if (logA > maxLogAcc) maxLogAcc = logA;
    }
  }

  // 2. Allocate normalized factor layers
  const normalizedHand = new Float32Array(n);
  const normalizedSlope = new Float32Array(n);
  const normalizedLogAcc = new Float32Array(n);
  const scores = new Float32Array(n);
  const classes: SusceptibilityClass[] = new Array(n);

  const { weights, thresholds, maxHandMeters, maxSlopeDegrees } = config;
  const totalWeight = weights.hand + weights.slope + weights.logAccumulation || 1.0;
  const wHand = weights.hand / totalWeight;
  const wSlope = weights.slope / totalWeight;
  const wAcc = weights.logAccumulation / totalWeight;

  for (let i = 0; i < n; i++) {
    if (isNaN(dem[i])) {
      normalizedHand[i] = NaN;
      normalizedSlope[i] = NaN;
      normalizedLogAcc[i] = NaN;
      scores[i] = NaN;
      classes[i] = "Low";
      continue;
    }

    // A. HAND Factor: Lower HAND = higher susceptibility
    // Guaranteed: lower HAND never decreases the score
    const h = Math.max(0, isNaN(hand[i]) ? maxHandMeters : hand[i]);
    const sHand = Math.max(0, Math.min(1, 1 - h / maxHandMeters));
    normalizedHand[i] = sHand;

    // B. Slope Factor: Flatter terrain = slower runoff drainage = higher pooling predisposition
    const s = Math.max(0, isNaN(slope[i]) ? maxSlopeDegrees : slope[i]);
    const sSlope = Math.max(0, Math.min(1, 1 - s / maxSlopeDegrees));
    normalizedSlope[i] = sSlope;

    // C. Log Accumulation Factor: Higher drainage area = greater flow convergence
    const acc = Math.max(1, accumulation[i]);
    const sAcc = Math.max(0, Math.min(1, Math.log(acc) / maxLogAcc));
    normalizedLogAcc[i] = sAcc;

    // Composite linear weighted score
    const compositeScore = wHand * sHand + wSlope * sSlope + wAcc * sAcc;
    scores[i] = compositeScore;

    // Classify
    if (compositeScore < thresholds.lowMax) {
      classes[i] = "Low";
    } else if (compositeScore < thresholds.moderateMax) {
      classes[i] = "Moderate";
    } else if (compositeScore < thresholds.highMax) {
      classes[i] = "High";
    } else {
      classes[i] = "Very High";
    }
  }

  // Cell explainability function for click-to-explain inspection
  const explainCell = (row: number, col: number): CellSusceptibilityExplanation => {
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      throw new Error(`Coordinates (${row}, ${col}) out of grid bounds (${rows}, ${cols})`);
    }

    const idx = row * cols + col;
    const score = scores[idx];
    const classification = classes[idx];

    const sH = normalizedHand[idx];
    const sS = normalizedSlope[idx];
    const sA = normalizedLogAcc[idx];

    const weightedH = wHand * sH;
    const weightedS = wSlope * sS;
    const weightedA = wAcc * sA;
    const sumWeighted = weightedH + weightedS + weightedA || 1.0;

    const contributions: FactorContributionDetail[] = [
      {
        factor: "hand",
        displayName: "Height Above Drainage (HAND)",
        rawValue: hand[idx],
        normalizedScore: sH,
        weight: wHand,
        contributionPercentage: Math.round((weightedH / sumWeighted) * 100),
        description: `Drainage height of ${hand[idx]?.toFixed(1)}m relative to channel bed`,
      },
      {
        factor: "slope",
        displayName: "Slope Flatness",
        rawValue: slope[idx],
        normalizedScore: sS,
        weight: wSlope,
        contributionPercentage: Math.round((weightedS / sumWeighted) * 100),
        description: `Local slope of ${slope[idx]?.toFixed(1)}° (${slope[idx] < 5 ? "flat lowland" : "steep hillside"})`,
      },
      {
        factor: "logAccumulation",
        displayName: "Upstream Flow Accumulation",
        rawValue: accumulation[idx],
        normalizedScore: sA,
        weight: wAcc,
        contributionPercentage: Math.round((weightedA / sumWeighted) * 100),
        description: `Drainage catchment area of ${accumulation[idx]} cells upstream`,
      },
    ];

    return {
      row,
      col,
      cellIndex: idx,
      score,
      classification,
      contributions,
      scientificDisclaimer:
        "Static morphological screening indicator. Represents terrain predisposition only; not a flood hazard prediction, water depth, or hydrodynamic forecast.",
    };
  };

  return {
    layerName: "flood susceptibility (terrain-based)",
    config,
    rows,
    cols,
    scores,
    classes,
    normalizedHand,
    normalizedSlope,
    normalizedLogAcc,
    explainCell,
  };
}
