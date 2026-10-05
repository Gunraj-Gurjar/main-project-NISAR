/**
 * flood-sim types and configuration interfaces
 * Pure TypeScript, zero external dependencies.
 */

export interface FloodSimConfig {
  /** Size of each DEM grid cell in meters (isotropic dx = dy) */
  cellSizeMeters: number;
  /** Stream threshold: min accumulation (cell count) to qualify as a drainage stream */
  accumulationThreshold: number;
  /** Maximum vertical fill in meters for pit conditioning guard */
  maxPitFillDepth: number;
  /** Peak stage above stream bed (m) at the flood source cell */
  sourcePeakStageMeters: number;
  /** Linear decay rate of peak stage per downstream meter (m/m) */
  stageDecayPerMeter: number;
  /** Stage hydrograph rise time (seconds) to peak */
  hydrographRiseSeconds: number;
  /** Stage hydrograph recession time constant (seconds) after peak */
  hydrographRecessionSeconds: number;
  /** Base illustrative flow speed along channel (m/s) at zero slope */
  minFlowSpeed: number;
  /** Max allowable illustrative flow speed (m/s) */
  maxFlowSpeed: number;
  /** Exponent on local channel slope in illustrative speed formula: v = clamp(v_min + k * S^exp, v_min, v_max) */
  slopeSpeedExponent: number;
  /** Speed scaling factor k */
  slopeSpeedMultiplier: number;
  /** Maximum allowable lateral spread distance from nearest route cell in meters */
  maxLateralDistanceMeters: number;
  /** Time step interval for simulation frames (seconds) */
  timeStepSeconds: number;
  /** Total duration of simulation in seconds */
  totalDurationSeconds: number;
  /** Optional custom source cell coordinate [row, col] */
  customSourceCell?: [number, number];
}

export const DEFAULT_SIM_CONFIG: FloodSimConfig = {
  cellSizeMeters: 30.0,
  accumulationThreshold: 15,
  maxPitFillDepth: 100.0,
  sourcePeakStageMeters: 10.0,
  stageDecayPerMeter: 0.0005, // 0.5m drop per km downstream
  hydrographRiseSeconds: 1800, // 30 min rise
  hydrographRecessionSeconds: 3600, // 60 min recession half-life
  minFlowSpeed: 0.8, // illustrative default
  maxFlowSpeed: 6.0, // illustrative ceiling
  slopeSpeedExponent: 0.5,
  slopeSpeedMultiplier: 15.0,
  maxLateralDistanceMeters: 600.0,
  timeStepSeconds: 300, // 5 minute steps
  totalDurationSeconds: 14400, // 4 hours
};

export interface SparseDepthStep {
  timeSeconds: number;
  /** 1D cell index in row-major layout: row * cols + col */
  cellIndices: Uint32Array;
  /** Water depth above terrain in meters */
  depths: Float32Array;
}

export interface RouteCellInfo {
  row: number;
  col: number;
  distanceFromSourceMeters: number;
  arrivalTimeSeconds: number;
  slope: number;
  speed: number;
  peakStageMeters: number;
}

export interface SimulationResult {
  config: FloodSimConfig;
  rows: number;
  cols: number;
  timeStepsSeconds: number[];
  steps: SparseDepthStep[];
  route: RouteCellInfo[];
  /** 1D array of size rows*cols, NaN for unflooded cells */
  peakDepthGrid: Float32Array;
  /** 1D array of size rows*cols, NaN for cells that never receive water */
  arrivalTimeGrid: Float32Array;
  handGrid: Float32Array;
  flowAccumulationGrid: Int32Array;
  conditionedDem: Float32Array;
}
