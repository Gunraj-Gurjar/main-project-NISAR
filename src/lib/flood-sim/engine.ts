import type { FloodSimConfig, SimulationResult, SparseDepthStep, RouteCellInfo } from "./types.ts";
import { DEFAULT_SIM_CONFIG } from "./types.ts";

/**
 * 8 neighbor direction offsets in row-major matrix:
 * 0: E  (0, +1)
 * 1: SE (+1, +1)
 * 2: S  (+1, 0)
 * 3: SW (+1, -1)
 * 4: W  (0, -1)
 * 5: NW (-1, -1)
 * 6: N  (-1, 0)
 * 7: NE (-1, +1)
 * -1: Pit / Outlet (no downhill neighbor)
 */
export const D8_DIRS: ReadonlyArray<[number, number]> = [
  [0, 1],   // 0: East
  [1, 1],   // 1: South-East
  [1, 0],   // 2: South
  [1, -1],  // 3: South-West
  [0, -1],  // 4: West
  [-1, -1], // 5: North-West
  [-1, 0],  // 6: North
  [-1, 1],  // 7: North-East
];

const SQRT2 = Math.SQRT2;

/**
 * Step 1: Condition DEM - Pit Filling with Max-Fill Guard
 * Uses an iterative elevation raising procedure towards lowest spillway threshold.
 * If elevation delta exceeds maxPitFillDepth, filling is clamped to the guard threshold.
 */
export function conditionDem(
  dem: Float32Array,
  rows: number,
  cols: number,
  maxPitFillDepth: number
): Float32Array {
  const conditioned = new Float32Array(dem);
  const n = rows * cols;
  let changed = true;
  let iterations = 0;
  const maxIterations = rows * cols;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const idx = r * cols + c;
        const elev = conditioned[idx];
        if (isNaN(elev)) continue;

        let minNeighborElev = Infinity;
        for (let d = 0; d < 8; d++) {
          const nr = r + D8_DIRS[d][0];
          const nc = c + D8_DIRS[d][1];
          const nElev = conditioned[nr * cols + nc];
          if (!isNaN(nElev) && nElev < minNeighborElev) {
            minNeighborElev = nElev;
          }
        }

        // If local depression/pit (strictly lower than all valid neighbors)
        if (minNeighborElev !== Infinity && elev < minNeighborElev) {
          const rawElev = dem[idx];
          const targetElev = Math.min(minNeighborElev, rawElev + maxPitFillDepth);
          if (targetElev > elev + 1e-4) {
            conditioned[idx] = targetElev;
            changed = true;
          }
        }
      }
    }
  }

  return conditioned;
}

/**
 * Step 2: D8 Flow Direction and Flow Accumulation
 * D8 assigns flow to the steepest downward slope neighbor.
 * Accumulation is computed topologically (each cell counts as 1 + contributions of upstream neighbors).
 */
export function computeD8AndAccumulation(
  dem: Float32Array,
  rows: number,
  cols: number,
  cellSizeMeters: number
): { flowDir: Int8Array; accumulation: Int32Array } {
  const n = rows * cols;
  const flowDir = new Int8Array(n).fill(-1);
  const accumulation = new Int32Array(n).fill(1);
  const inDegree = new Int16Array(n).fill(0);

  // 1. Compute steepest descent D8 direction
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const elev = dem[idx];
      if (isNaN(elev)) continue;

      let maxDropSlope = 0;
      let bestDir = -1;

      for (let d = 0; d < 8; d++) {
        const nr = r + D8_DIRS[d][0];
        const nc = c + D8_DIRS[d][1];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

        const nIdx = nr * cols + nc;
        const nElev = dem[nIdx];
        if (isNaN(nElev)) continue;

        const dist = (d % 2 === 1) ? cellSizeMeters * SQRT2 : cellSizeMeters;
        const slope = (elev - nElev) / dist;

        if (slope > maxDropSlope) {
          maxDropSlope = slope;
          bestDir = d;
        }
      }

      flowDir[idx] = bestDir;
      if (bestDir !== -1) {
        const targetR = r + D8_DIRS[bestDir][0];
        const targetC = c + D8_DIRS[bestDir][1];
        const targetIdx = targetR * cols + targetC;
        inDegree[targetIdx]++;
      }
    }
  }

  // 2. Compute accumulation via Kahn's topological sort
  // Start with headwaters (inDegree === 0)
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!isNaN(dem[i]) && inDegree[i] === 0) {
      queue.push(i);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const currIdx = queue[head++];
    const dir = flowDir[currIdx];
    if (dir === -1) continue;

    const r = Math.floor(currIdx / cols);
    const c = currIdx % cols;
    const nr = r + D8_DIRS[dir][0];
    const nc = c + D8_DIRS[dir][1];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

    const targetIdx = nr * cols + nc;
    accumulation[targetIdx] += accumulation[currIdx];
    inDegree[targetIdx]--;
    if (inDegree[targetIdx] === 0) {
      queue.push(targetIdx);
    }
  }

  return { flowDir, accumulation };
}

/**
 * Step 3: HAND (Height Above Nearest Drainage)
 * Traces each cell downstream along D8 until it intersects a stream cell (accumulation >= threshold).
 * HAND = cell_elevation - nearest_stream_elevation.
 * Also returns the index of that nearest drainage stream cell for lateral routing.
 */
export function computeHand(
  dem: Float32Array,
  flowDir: Int8Array,
  accumulation: Int32Array,
  rows: number,
  cols: number,
  accumulationThreshold: number
): { hand: Float32Array; nearestStreamIndex: Int32Array } {
  const n = rows * cols;
  const hand = new Float32Array(n).fill(NaN);
  const nearestStreamIndex = new Int32Array(n).fill(-1);

  // First identify stream cells
  for (let i = 0; i < n; i++) {
    if (!isNaN(dem[i]) && accumulation[i] >= accumulationThreshold) {
      hand[i] = 0;
      nearestStreamIndex[i] = i;
    }
  }

  // For non-stream cells, trace downstream along flowDir
  for (let i = 0; i < n; i++) {
    if (isNaN(dem[i])) continue;
    if (nearestStreamIndex[i] !== -1) continue;

    const path: number[] = [];
    let curr = i;
    let foundStreamIdx = -1;

    // Follow flow path with cycle/bound safety
    while (curr !== -1 && !isNaN(dem[curr])) {
      if (nearestStreamIndex[curr] !== -1) {
        foundStreamIdx = nearestStreamIndex[curr];
        break;
      }
      path.push(curr);
      const dir = flowDir[curr];
      if (dir === -1) break;

      const r = Math.floor(curr / cols);
      const c = curr % cols;
      const nr = r + D8_DIRS[dir][0];
      const nc = c + D8_DIRS[dir][1];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) break;

      const nextIdx = nr * cols + nc;
      if (path.includes(nextIdx)) break; // cycle protection
      curr = nextIdx;
    }

    if (foundStreamIdx !== -1) {
      const streamElev = dem[foundStreamIdx];
      for (const p of path) {
        nearestStreamIndex[p] = foundStreamIdx;
        hand[p] = Math.max(0, dem[p] - streamElev);
      }
    } else {
      // Drains off grid without hitting stream threshold: reference its terminal outlet
      const outletIdx = path.length ? path[path.length - 1] : i;
      const baseElev = dem[outletIdx];
      for (const p of path) {
        nearestStreamIndex[p] = outletIdx;
        hand[p] = Math.max(0, dem[p] - baseElev);
      }
    }
  }

  return { hand, nearestStreamIndex };
}

/**
 * Step 4: Source Selection
 * Finds the upstream-most cell of the main drainage channel (highest terminal accumulation).
 */
export function selectSourceCell(
  accumulation: Int32Array,
  flowDir: Int8Array,
  rows: number,
  cols: number,
  accumulationThreshold: number,
  customSourceCell?: [number, number]
): [number, number] {
  if (customSourceCell) {
    const [r, c] = customSourceCell;
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      return [r, c];
    }
  }

  // 1. Locate the main river outlet (highest accumulation on the map)
  let maxAcc = -1;
  let outletIdx = -1;
  const n = rows * cols;
  for (let i = 0; i < n; i++) {
    if (accumulation[i] > maxAcc) {
      maxAcc = accumulation[i];
      outletIdx = i;
    }
  }

  if (outletIdx === -1 || maxAcc < accumulationThreshold) {
    return [0, 0];
  }

  // 2. Trace backwards from outlet along the highest accumulation branch
  // Create inverted graph: upstream adjacency
  let curr = outletIdx;
  while (true) {
    const r = Math.floor(curr / cols);
    const c = curr % cols;

    let bestUpstream = -1;
    let highestUpstreamAcc = -1;

    // Check all 8 neighbors flowing into curr
    for (let d = 0; d < 8; d++) {
      const nr = r + D8_DIRS[d][0];
      const nc = c + D8_DIRS[d][1];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const nIdx = nr * cols + nc;

      const neighborDir = flowDir[nIdx];
      if (neighborDir === -1) continue;

      // Check if neighbor flows directly to (r, c)
      const targetR = nr + D8_DIRS[neighborDir][0];
      const targetC = nc + D8_DIRS[neighborDir][1];
      if (targetR === r && targetC === c) {
        const isStraight = (d % 2 === 0); // cardinal neighbor is straighter than diagonal
        const isBetter =
          accumulation[nIdx] > highestUpstreamAcc ||
          (accumulation[nIdx] === highestUpstreamAcc && isStraight && bestUpstream !== -1 && (d % 2 === 0)) ||
          (accumulation[nIdx] === highestUpstreamAcc && bestUpstream === -1);

        if (isBetter) {
          highestUpstreamAcc = accumulation[nIdx];
          bestUpstream = nIdx;
        }
      }
    }

    if (bestUpstream !== -1) {
      curr = bestUpstream;
    } else {
      // Reached the true upstream headwater cell of the main channel
      break;
    }
  }

  return [Math.floor(curr / cols), curr % cols];
}

/**
 * Step 5: Route downstream from source
 * Computes segment length, illustrative slope-dependent flow speed, and cumulative arrival time.
 * Speed formula (illustrative):
 *   v = clamp(v_min + k * S^exponent, v_min, v_max)
 */
export function buildFloodRoute(
  sourceCell: [number, number],
  flowDir: Int8Array,
  dem: Float32Array,
  rows: number,
  cols: number,
  config: FloodSimConfig
): RouteCellInfo[] {
  const route: RouteCellInfo[] = [];
  const visited = new Set<number>();

  let currR = sourceCell[0];
  let currC = sourceCell[1];
  let cumDistance = 0;
  let cumArrivalTime = 0;

  while (currR >= 0 && currR < rows && currC >= 0 && currC < cols) {
    const idx = currR * cols + currC;
    if (visited.has(idx)) break; // prevent infinite loops
    visited.add(idx);

    const dir = flowDir[idx];
    const currentElev = dem[idx];

    let segLength = 0;
    let nextElev = currentElev;
    let nextR = -1;
    let nextC = -1;

    if (dir !== -1) {
      nextR = currR + D8_DIRS[dir][0];
      nextC = currC + D8_DIRS[dir][1];
      if (nextR >= 0 && nextR < rows && nextC >= 0 && nextC < cols) {
        const nextIdx = nextR * cols + nextC;
        nextElev = dem[nextIdx];
        segLength = (dir % 2 === 1) ? config.cellSizeMeters * SQRT2 : config.cellSizeMeters;
      }
    }

    // Local downward slope (clamped to positive)
    const drop = Math.max(0, currentElev - nextElev);
    const slope = segLength > 0 ? drop / segLength : 0;

    // Illustrative speed
    const illustrativeSpeed = Math.min(
      config.maxFlowSpeed,
      Math.max(
        config.minFlowSpeed,
        config.minFlowSpeed + config.slopeSpeedMultiplier * Math.pow(slope, config.slopeSpeedExponent)
      )
    );

    // Peak stage decayed by downstream distance
    const peakStage = Math.max(
      0,
      config.sourcePeakStageMeters - cumDistance * config.stageDecayPerMeter
    );

    route.push({
      row: currR,
      col: currC,
      distanceFromSourceMeters: cumDistance,
      arrivalTimeSeconds: cumArrivalTime,
      slope,
      speed: illustrativeSpeed,
      peakStageMeters: peakStage,
    });

    if (segLength === 0 || nextR === -1) {
      break; // Reached outlet or boundary
    }

    cumDistance += segLength;
    cumArrivalTime += segLength / illustrativeSpeed;
    currR = nextR;
    currC = nextC;
  }

  return route;
}

/**
 * Step 6: Stage Hydrograph
 * Computes instantaneous stage(t) at a route cell with arrival offset:
 * - Before arrival: 0
 * - Rise phase: smooth parabolic/linear rise to peak
 * - Recession phase: exponential decay
 */
export function computeRouteStage(
  t: number,
  routeCell: RouteCellInfo,
  config: FloodSimConfig
): number {
  const dt = t - routeCell.arrivalTimeSeconds;
  if (dt <= 0) return 0; // Wave hasn't arrived

  const tRise = config.hydrographRiseSeconds;
  const tRec = config.hydrographRecessionSeconds;

  if (dt <= tRise) {
    // Smooth quadratic ease-in ease-out rise: [0 -> 1]
    const u = dt / tRise;
    const factor = Math.sin((u * Math.PI) / 2);
    return routeCell.peakStageMeters * factor;
  } else {
    // Exponential recession: stage * exp(-(t - tRise) / tRec)
    const recDt = dt - tRise;
    return routeCell.peakStageMeters * Math.exp(-recDt / tRec);
  }
}

/**
 * Steps 7 & 8: Simulation Execution and Sparse Depth Outputs
 */
export function runFloodSimulation(
  rawDem: Float32Array,
  rows: number,
  cols: number,
  partialConfig: Partial<FloodSimConfig> = {}
): SimulationResult {
  const config: FloodSimConfig = { ...DEFAULT_SIM_CONFIG, ...partialConfig };
  const n = rows * cols;

  // 1. Condition DEM
  const dem = conditionDem(rawDem, rows, cols, config.maxPitFillDepth);

  // 2. D8 Flow and Accumulation
  const { flowDir, accumulation } = computeD8AndAccumulation(dem, rows, cols, config.cellSizeMeters);

  // 3. HAND and Drainage Mapping
  const { hand, nearestStreamIndex } = computeHand(
    dem,
    flowDir,
    accumulation,
    rows,
    cols,
    config.accumulationThreshold
  );

  // 4. Source Selection
  const sourceCell = selectSourceCell(
    accumulation,
    flowDir,
    rows,
    cols,
    config.accumulationThreshold,
    config.customSourceCell
  );

  // 5. Build Flood Route
  const route = buildFloodRoute(sourceCell, flowDir, dem, rows, cols, config);

  // Fast route lookup: map grid index -> route index
  const routeCellMap = new Map<number, number>();
  for (let rIdx = 0; rIdx < route.length; rIdx++) {
    const c = route[rIdx];
    routeCellMap.set(c.row * cols + c.col, rIdx);
  }

  // Pre-calculate nearest route cell and distance for each grid cell
  // A cell is eligible for inundation if its nearest drainage cell along flow path is on the flood route
  const cellRouteIndex = new Int32Array(n).fill(-1);
  const cellLateralDist = new Float32Array(n).fill(Infinity);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (isNaN(dem[idx])) continue;

      const drainageIdx = nearestStreamIndex[idx];
      if (drainageIdx !== -1 && routeCellMap.has(drainageIdx)) {
        const rIdx = routeCellMap.get(drainageIdx)!;
        const routeCell = route[rIdx];
        const dr = (r - routeCell.row) * config.cellSizeMeters;
        const dc = (c - routeCell.col) * config.cellSizeMeters;
        const dist = Math.sqrt(dr * dr + dc * dc);

        if (dist <= config.maxLateralDistanceMeters) {
          cellRouteIndex[idx] = rIdx;
          cellLateralDist[idx] = dist;
        }
      }
    }
  }

  // Generate discrete time steps
  const timeStepsSeconds: number[] = [];
  for (let t = 0; t <= config.totalDurationSeconds; t += config.timeStepSeconds) {
    timeStepsSeconds.push(t);
  }

  const steps: SparseDepthStep[] = [];
  const peakDepthGrid = new Float32Array(n).fill(NaN);
  const arrivalTimeGrid = new Float32Array(n).fill(NaN);

  // Dynamic memory scratch buffers
  const tempIndices = new Uint32Array(n);
  const tempDepths = new Float32Array(n);

  for (const t of timeStepsSeconds) {
    // 1. Evaluate stage at each route cell for time t
    const currentRouteStages = new Float32Array(route.length);
    for (let rIdx = 0; rIdx < route.length; rIdx++) {
      currentRouteStages[rIdx] = computeRouteStage(t, route[rIdx], config);
    }

    let activeCount = 0;

    // 2. Lateral spread inundation check
    for (let i = 0; i < n; i++) {
      const rIdx = cellRouteIndex[i];
      if (rIdx === -1) continue;

      const routeStage = currentRouteStages[rIdx];
      const cellHand = hand[i];

      // Flooded condition: HAND <= stage at corresponding route cell
      if (routeStage > 0 && cellHand <= routeStage) {
        const depth = routeStage - cellHand;
        if (depth > 0.01) { // 1cm minimum depth threshold
          tempIndices[activeCount] = i;
          tempDepths[activeCount] = depth;
          activeCount++;

          // Update peak depth
          if (isNaN(peakDepthGrid[i]) || depth > peakDepthGrid[i]) {
            peakDepthGrid[i] = depth;
          }

          // Update first arrival time
          if (isNaN(arrivalTimeGrid[i])) {
            arrivalTimeGrid[i] = t;
          }
        }
      }
    }

    // Allocate exact typed arrays for sparse frame
    const stepIndices = new Uint32Array(activeCount);
    const stepDepths = new Float32Array(activeCount);
    stepIndices.set(tempIndices.subarray(0, activeCount));
    stepDepths.set(tempDepths.subarray(0, activeCount));

    steps.push({
      timeSeconds: t,
      cellIndices: stepIndices,
      depths: stepDepths,
    });
  }

  return {
    config,
    rows,
    cols,
    timeStepsSeconds,
    steps,
    route,
    peakDepthGrid,
    arrivalTimeGrid,
    handGrid: hand,
    flowAccumulationGrid: accumulation,
    conditionedDem: dem,
  };
}
