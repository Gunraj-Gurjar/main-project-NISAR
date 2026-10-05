/**
 * Static Terrain-Based Flood Susceptibility Types
 * Strictly complies with Scientific Guardrails:
 * - Named "flood susceptibility (terrain-based)", NEVER "hazard" or "prediction".
 * - Shows static morphological predisposition, NOT temporal probability, forecast, or depth.
 */

export type SusceptibilityClass = "Low" | "Moderate" | "High" | "Very High";

export interface SusceptibilityWeights {
  /** Weight for Height Above Nearest Drainage factor (lower HAND = higher susceptibility) */
  hand: number;
  /** Weight for Slope Flatness factor (flatter slope = higher pooling predisposition) */
  slope: number;
  /** Weight for Log Flow Accumulation factor (higher accumulation = larger catchment) */
  logAccumulation: number;
}

export interface SusceptibilityThresholds {
  /** Upper bound score for 'Low' classification */
  lowMax: number;
  /** Upper bound score for 'Moderate' classification */
  moderateMax: number;
  /** Upper bound score for 'High' classification */
  highMax: number;
  // Above highMax is 'Very High'
}

export interface TerrainSusceptibilityConfig {
  /** Weightings for each normalized morphological factor (illustrative defaults, sum to 1.0) */
  weights: SusceptibilityWeights;
  /** Classification score cutoff thresholds */
  thresholds: SusceptibilityThresholds;
  /** HAND upper normalization cap in meters (cells with HAND >= cap receive 0 HAND score) */
  maxHandMeters: number;
  /** Slope upper normalization cap in degrees (cells with slope >= cap receive 0 slope score) */
  maxSlopeDegrees: number;
}

export const DEFAULT_SUSCEPTIBILITY_CONFIG: TerrainSusceptibilityConfig = {
  // Illustrative weights balancing hydrological proximity (HAND), drainage area (logAcc), and energy dissipation (slope)
  weights: {
    hand: 0.50,
    slope: 0.25,
    logAccumulation: 0.25,
  },
  // Standard 4-tier screening thresholds
  thresholds: {
    lowMax: 0.35,
    moderateMax: 0.60,
    highMax: 0.80,
  },
  maxHandMeters: 50.0,
  maxSlopeDegrees: 35.0,
};

export interface FactorContributionDetail {
  factor: "hand" | "slope" | "logAccumulation";
  displayName: string;
  rawValue: number;
  normalizedScore: number;
  weight: number;
  contributionPercentage: number;
  description: string;
}

export interface CellSusceptibilityExplanation {
  row: number;
  col: number;
  cellIndex: number;
  score: number;
  classification: SusceptibilityClass;
  contributions: FactorContributionDetail[];
  scientificDisclaimer: string;
}

export interface TerrainSusceptibilityResult {
  layerName: "flood susceptibility (terrain-based)";
  config: TerrainSusceptibilityConfig;
  rows: number;
  cols: number;
  /** Normalized composite score [0.0, 1.0] for each cell */
  scores: Float32Array;
  /** Categorical classification string per cell */
  classes: SusceptibilityClass[];
  /** Normalized factor score grids [0.0, 1.0] */
  normalizedHand: Float32Array;
  normalizedSlope: Float32Array;
  normalizedLogAcc: Float32Array;
  /** Method to retrieve full explainability breakdown for any cell */
  explainCell: (row: number, col: number) => CellSusceptibilityExplanation;
}
