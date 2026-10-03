// Terrain Analysis & Factor Explainability Engine
// Strictly follows Scientific Guardrails:
// - Terminology: 'flood susceptibility', 'terrain-based screening', 'advisory'
// - DEM shows static morphological predisposition, NOT probability, timing, depth, or real-time event forecast
// - Every susceptibility output is fully explainable with explicit factor weights and normalized scores
// - No invented or simulated validation metrics or fake accuracy scores

export interface FactorWeights {
  relativeElevation: number;
  slopeFlatness: number;
  curvatureConcavity: number;
  wetnessIndex: number;
}

export const DEFAULT_FACTOR_WEIGHTS: FactorWeights = {
  relativeElevation: 0.35,
  slopeFlatness: 0.30,
  curvatureConcavity: 0.20,
  wetnessIndex: 0.15,
};

export interface FactorBreakdown {
  name: string;
  weight: number;
  meanScore: number;
  contributionPct: number;
  description: string;
}

export interface SusceptibilityZoneStats {
  label: "Low" | "Moderate" | "High" | "Very High";
  percentage: number;
  cellCount: number;
  meanScore: number;
}

export interface TerrainAnalysis {
  slope: number[][];
  aspect: number[][];
  classification: string[][];
  elevationZone: string[][];
  floodSusceptibility: number[][]; // Explainable susceptibility score [0, 1]
  slopeInstability: number[][];   // Steep slope predisposition [0, 1]
  roughness: number[][];
  ridgeValley: number[][];        // Laplacian curvature: positive = hollow/valley, negative = crest/ridge
  contours: ContourLine[];
  heatmap: number[][];
  factorLayers: {
    relativeElevation: number[][];
    slopeFlatness: number[][];
    curvatureConcavity: number[][];
    wetnessIndex: number[][];
  };
  metrics: TerrainMetrics;
}

export interface ContourLine {
  level: number;
  points: [number, number][];
}

export interface TerrainMetrics {
  meanElevation: number;
  stdElevation: number;
  meanSlope: number;
  maxSlope: number;
  classification: {
    counts: Record<string, number>;
    percentages: Record<string, number>;
    labels: string[];
  };
  susceptibilitySummary: {
    zones: SusceptibilityZoneStats[];
    factorBreakdowns: FactorBreakdown[];
    highSusceptibilityPct: number;
    moderateSusceptibilityPct: number;
    weights: FactorWeights;
  };
  roughnessStats: { mean: number; max: number; std: number };
}

export function analyzeTerrrain(
  elevation: number[][],
  customWeights: FactorWeights = DEFAULT_FACTOR_WEIGHTS
): TerrainAnalysis {
  const rows = elevation.length;
  const cols = elevation[0].length;

  const slope = computeSlope(elevation);
  const aspect = computeAspect(elevation);
  const classification = classifyTerrain(elevation, slope);
  const elevationZone = zoneElevation(elevation);
  const roughness = computeRoughness(elevation);
  const ridgeValley = computeRidgeValley(elevation);
  const contours = generateContours(elevation, 8);
  const heatmap = normalizeGrid(elevation);

  // Compute explainable individual hydrological factor layers
  const factorLayers = computeFactorLayers(elevation, slope, ridgeValley);

  // Compute explainable multi-criteria flood susceptibility
  const floodSusceptibility = computeSusceptibility(factorLayers, customWeights);

  // Compute slope instability predisposition (steep slope + roughness)
  const slopeInstability = computeSlopeInstability(slope, roughness);

  const metrics = computeMetrics(
    elevation,
    slope,
    classification,
    floodSusceptibility,
    roughness,
    factorLayers,
    customWeights
  );

  return {
    slope,
    aspect,
    classification,
    elevationZone,
    floodSusceptibility,
    slopeInstability,
    roughness,
    ridgeValley,
    contours,
    heatmap,
    factorLayers,
    metrics,
  };
}

function computeSlope(elev: number[][]): number[][] {
  const rows = elev.length;
  const cols = elev[0].length;
  const result: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 1; i < rows - 1; i++) {
    for (let j = 1; j < cols - 1; j++) {
      const dzdx = (elev[i][j + 1] - elev[i][j - 1]) / 2;
      const dzdy = (elev[i + 1][j] - elev[i - 1][j]) / 2;
      result[i][j] = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);
    }
  }
  return result;
}

function computeAspect(elev: number[][]): number[][] {
  const rows = elev.length;
  const cols = elev[0].length;
  const result: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 1; i < rows - 1; i++) {
    for (let j = 1; j < cols - 1; j++) {
      const dzdx = (elev[i][j + 1] - elev[i][j - 1]) / 2;
      const dzdy = (elev[i + 1][j] - elev[i - 1][j]) / 2;
      let asp = Math.atan2(-dzdy, dzdx) * (180 / Math.PI);
      if (asp < 0) asp += 360;
      result[i][j] = asp;
    }
  }
  return result;
}

function classifyTerrain(elev: number[][], slope: number[][]): string[][] {
  const rows = elev.length;
  const cols = elev[0].length;
  const { mean: meanElev } = stats(elev);
  const result: string[][] = Array.from({ length: rows }, () => new Array(cols).fill("plain"));

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const s = slope[i][j];
      const e = elev[i][j];
      let isValley = true;
      for (let di = -2; di <= 2 && isValley; di++) {
        for (let dj = -2; dj <= 2 && isValley; dj++) {
          if (di === 0 && dj === 0) continue;
          const ni = i + di;
          const nj = j + dj;
          if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
            if (elev[ni][nj] < e - 15) isValley = false;
          }
        }
      }

      if (s > 30 && e > meanElev * 1.3) result[i][j] = "mountain";
      else if (s > 12) result[i][j] = "hill";
      else if (isValley && e < meanElev * 0.85) result[i][j] = "valley";
      else result[i][j] = "plain";
    }
  }
  return result;
}

function zoneElevation(elev: number[][]): string[][] {
  const { min, max } = stats(elev);
  const range = max - min || 1;
  return elev.map((row) =>
    row.map((v) => {
      const norm = (v - min) / range;
      if (norm < 0.33) return "low";
      if (norm < 0.66) return "medium";
      return "high";
    })
  );
}

function computeFactorLayers(elev: number[][], slope: number[][], ridgeValley: number[][]) {
  const rows = elev.length;
  const cols = elev[0].length;
  const { min: minE, max: maxE } = stats(elev);
  const elevRange = maxE - minE || 1;

  // 1. Relative elevation: lower land = higher predisposition (1 - normalized elev)
  const relativeElevation: number[][] = elev.map((row) =>
    row.map((v) => Math.max(0, Math.min(1, 1 - (v - minE) / elevRange)))
  );

  // 2. Slope flatness: flatter land (< 3 degrees) has highest pooling tendency
  const slopeFlatness: number[][] = slope.map((row) =>
    row.map((s) => {
      if (s <= 3) return 1.0;
      if (s >= 35) return 0.0;
      return Math.max(0, Math.min(1, 1 - (s - 3) / 32));
    })
  );

  // 3. Curvature concavity (positive ridgeValley indicates hollow/depression)
  let maxRv = 1;
  ridgeValley.forEach((row) =>
    row.forEach((v) => {
      if (Math.abs(v) > maxRv) maxRv = Math.abs(v);
    })
  );
  const curvatureConcavity: number[][] = ridgeValley.map((row) =>
    row.map((rv) => Math.max(0, Math.min(1, (rv + maxRv) / (2 * maxRv))))
  );

  // 4. Wetness Index proxy (ln(local contributing area / tan(slope)))
  const wetnessIndex: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const sRad = Math.max(0.01, (slope[i][j] * Math.PI) / 180);
      const tanS = Math.tan(sRad);
      // Local flow convergence proxy combining low elevation and concavity
      const relLow = relativeElevation[i][j];
      const concav = curvatureConcavity[i][j];
      const proxyAccum = 1 + (relLow * 5 + concav * 3);
      const twi = Math.log(proxyAccum / tanS);
      // Normalized between 0 and 1
      wetnessIndex[i][j] = Math.max(0, Math.min(1, (twi + 2) / 8));
    }
  }

  return {
    relativeElevation,
    slopeFlatness,
    curvatureConcavity,
    wetnessIndex,
  };
}

function computeSusceptibility(
  factors: {
    relativeElevation: number[][];
    slopeFlatness: number[][];
    curvatureConcavity: number[][];
    wetnessIndex: number[][];
  },
  weights: FactorWeights
): number[][] {
  const rows = factors.relativeElevation.length;
  const cols = factors.relativeElevation[0].length;
  const totalWeight =
    weights.relativeElevation +
    weights.slopeFlatness +
    weights.curvatureConcavity +
    weights.wetnessIndex || 1;

  const normW = {
    elev: weights.relativeElevation / totalWeight,
    slope: weights.slopeFlatness / totalWeight,
    curv: weights.curvatureConcavity / totalWeight,
    wet: weights.wetnessIndex / totalWeight,
  };

  const result: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const score =
        normW.elev * factors.relativeElevation[i][j] +
        normW.slope * factors.slopeFlatness[i][j] +
        normW.curv * factors.curvatureConcavity[i][j] +
        normW.wet * factors.wetnessIndex[i][j];
      result[i][j] = Math.max(0, Math.min(1, score));
    }
  }
  return result;
}

function computeSlopeInstability(slope: number[][], roughness: number[][]): number[][] {
  const rows = slope.length;
  const cols = slope[0].length;
  const { max: maxR } = stats(roughness);
  const result: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const sFactor = Math.min(1, slope[i][j] / 50); // slopes > 50 deg approach 1
      const rFactor = Math.min(1, roughness[i][j] / (maxR || 1));
      result[i][j] = Math.max(0, Math.min(1, sFactor * 0.7 + rFactor * 0.3));
    }
  }
  return result;
}

function computeRoughness(elev: number[][]): number[][] {
  const rows = elev.length;
  const cols = elev[0].length;
  const result: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 1; i < rows - 1; i++) {
    for (let j = 1; j < cols - 1; j++) {
      let sum = 0;
      let count = 0;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          if (di === 0 && dj === 0) continue;
          sum += Math.abs(elev[i + di][j + dj] - elev[i][j]);
          count++;
        }
      }
      result[i][j] = sum / count;
    }
  }
  return result;
}

function computeRidgeValley(elev: number[][]): number[][] {
  const rows = elev.length;
  const cols = elev[0].length;
  const result: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 1; i < rows - 1; i++) {
    for (let j = 1; j < cols - 1; j++) {
      result[i][j] =
        elev[i - 1][j] + elev[i + 1][j] + elev[i][j - 1] + elev[i][j + 1] - 4 * elev[i][j];
    }
  }
  return result;
}

function generateContours(elev: number[][], numLevels: number): ContourLine[] {
  const { min, max } = stats(elev);
  const step = (max - min) / (numLevels + 1);
  const contours: ContourLine[] = [];
  const rows = elev.length;
  const cols = elev[0].length;

  for (let l = 1; l <= numLevels; l++) {
    const level = min + step * l;
    const points: [number, number][] = [];
    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const v = elev[i][j];
        const vr = elev[i][j + 1];
        const vb = elev[i + 1][j];
        if ((v <= level && vr > level) || (v > level && vr <= level)) {
          const t = (level - v) / (vr - v);
          points.push([i, j + t]);
        }
        if ((v <= level && vb > level) || (v > level && vb <= level)) {
          const t = (level - v) / (vb - v);
          points.push([i + t, j]);
        }
      }
    }
    contours.push({ level, points });
  }
  return contours;
}

function normalizeGrid(elev: number[][]): number[][] {
  const { min, max } = stats(elev);
  const range = max - min || 1;
  return elev.map((row) => row.map((v) => (v - min) / range));
}

function stats(grid: number[][]) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  const values: number[] = [];
  grid.forEach((row) =>
    row.forEach((v) => {
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      count++;
      values.push(v);
    })
  );
  const mean = sum / (count || 1);
  let variance = 0;
  values.forEach((v) => (variance += (v - mean) ** 2));
  const std = Math.sqrt(variance / (count || 1));
  return { min, max, mean, std };
}

function computeMetrics(
  elev: number[][],
  slope: number[][],
  classification: string[][],
  floodSusceptibility: number[][],
  roughness: number[][],
  factors: {
    relativeElevation: number[][];
    slopeFlatness: number[][];
    curvatureConcavity: number[][];
    wetnessIndex: number[][];
  },
  weights: FactorWeights
): TerrainMetrics {
  const elevStats = stats(elev);
  const slopeStats = stats(slope);
  const roughStats = stats(roughness);

  const labels = ["plain", "hill", "mountain", "valley"];
  const counts: Record<string, number> = { plain: 0, hill: 0, mountain: 0, valley: 0 };
  const total = classification.length * classification[0].length;
  classification.forEach((row) => row.forEach((c) => counts[c]++));
  const percentages: Record<string, number> = {};
  labels.forEach((l) => (percentages[l] = (counts[l] / total) * 100));

  // Genuine explainable factor breakdowns
  const factorStats = {
    elev: stats(factors.relativeElevation),
    slope: stats(factors.slopeFlatness),
    curv: stats(factors.curvatureConcavity),
    wet: stats(factors.wetnessIndex),
  };

  const totalWeight =
    weights.relativeElevation +
    weights.slopeFlatness +
    weights.curvatureConcavity +
    weights.wetnessIndex || 1;

  const factorBreakdowns: FactorBreakdown[] = [
    {
      name: "Relative Elevation (Depression)",
      weight: weights.relativeElevation,
      meanScore: factorStats.elev.mean,
      contributionPct: (weights.relativeElevation / totalWeight) * 100,
      description: "Low-lying areas predisposition to stormwater pooling",
    },
    {
      name: "Slope Flatness",
      weight: weights.slopeFlatness,
      meanScore: factorStats.slope.mean,
      contributionPct: (weights.slopeFlatness / totalWeight) * 100,
      description: "Gentle slopes (< 3°) limit overland runoff velocity",
    },
    {
      name: "Curvature Concavity",
      weight: weights.curvatureConcavity,
      meanScore: factorStats.curv.mean,
      contributionPct: (weights.curvatureConcavity / totalWeight) * 100,
      description: "Topographic concavities and depressions collect convergent flow",
    },
    {
      name: "Topographic Wetness Index Proxy",
      weight: weights.wetnessIndex,
      meanScore: factorStats.wet.mean,
      contributionPct: (weights.wetnessIndex / totalWeight) * 100,
      description: "Hydrological equilibrium indicator ln(a / tan β)",
    },
  ];

  // Susceptibility categorization (explainable bins)
  let lowCount = 0;
  let modCount = 0;
  let highCount = 0;
  let vhighCount = 0;
  let lowSum = 0;
  let modSum = 0;
  let highSum = 0;
  let vhighSum = 0;

  floodSusceptibility.forEach((row) =>
    row.forEach((v) => {
      if (v >= 0.7) {
        vhighCount++;
        vhighSum += v;
      } else if (v >= 0.5) {
        highCount++;
        highSum += v;
      } else if (v >= 0.3) {
        modCount++;
        modSum += v;
      } else {
        lowCount++;
        lowSum += v;
      }
    })
  );

  const zones: SusceptibilityZoneStats[] = [
    {
      label: "Very High",
      percentage: (vhighCount / total) * 100,
      cellCount: vhighCount,
      meanScore: vhighCount ? vhighSum / vhighCount : 0,
    },
    {
      label: "High",
      percentage: (highCount / total) * 100,
      cellCount: highCount,
      meanScore: highCount ? highSum / highCount : 0,
    },
    {
      label: "Moderate",
      percentage: (modCount / total) * 100,
      cellCount: modCount,
      meanScore: modCount ? modSum / modCount : 0,
    },
    {
      label: "Low",
      percentage: (lowCount / total) * 100,
      cellCount: lowCount,
      meanScore: lowCount ? lowSum / lowCount : 0,
    },
  ];

  return {
    meanElevation: elevStats.mean,
    stdElevation: elevStats.std,
    meanSlope: slopeStats.mean,
    maxSlope: slopeStats.max,
    classification: {
      counts,
      percentages,
      labels,
    },
    susceptibilitySummary: {
      zones,
      factorBreakdowns,
      highSusceptibilityPct: ((vhighCount + highCount) / total) * 100,
      moderateSusceptibilityPct: (modCount / total) * 100,
      weights,
    },
    roughnessStats: {
      mean: roughStats.mean,
      max: roughStats.max,
      std: roughStats.std,
    },
  };
}
