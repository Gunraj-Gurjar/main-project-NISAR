# Flood Simulation Engine Specification & Architecture

This document specifies the numerical and topological algorithms implemented in `src/lib/flood-sim/` for illustrative terrain-derived flood simulation.

> [!IMPORTANT]
> **Scientific Guardrail Compliance:**
> This simulation is an illustrative scenario demo on sample terrain. It is not an operational forecast, warning, or hydrodynamic prediction. All stage heights, propagation velocities, and decay coefficients are illustrative defaults.

---

## 1. Algorithm Overview

The simulation is derived purely from Digital Elevation Models (DEM) via standard hydrologic and topological procedures:

```
[Raw DEM (Float32Array)]
          │
          ▼
   1. Pit Conditioning (Spillway Filling with maxPitFillDepth guard)
          │
          ▼
   2. D8 Flow Direction & Topological Accumulation (Kahn's Algorithm)
          │
          ▼
   3. HAND (Height Above Nearest Drainage) & Drainage Basin Indexing
          │
          ▼
   4. Main Channel Source Selection (Upstream-most high accumulation cell)
          │
          ▼
   5. Dynamic Flood Route Construction (Downstream D8 tracing with slope-dependent speed)
          │
          ▼
   6. Stage Hydrograph Evaluation (Rise & Exponential Recession with distance decay)
          │
          ▼
   7. Lateral Inundation Mapping (Depth = Stage - HAND within lateral threshold)
          │
          ▼
   8. Sparse Memory Step Serialization (Uint32 indices + Float32 depths)
```

---

## 2. Mathematical & Algorithmic Steps

### Step 1: DEM Conditioning (Pit Fill Guard)
- **Problem:** Real or synthetic DEMs often contain local sinks where all 8 neighboring cells are higher.
- **Method:** Iterative priority filling. For each pit cell $(r, c)$:
  $$z_{\text{target}} = \min\left(\min_{d \in D8} z_{\text{neighbor}}, \; z_{\text{raw}} + \text{maxPitFillDepth}\right)$$
- If the required fill exceeds `maxPitFillDepth`, the pit remains guarded to avoid filling immense natural canyons.

### Step 2: D8 Flow Direction & Flow Accumulation
- **D8 Direction:** Each cell flows to the single neighbor that yields the steepest downward slope:
  $$S_d = \frac{z_{r,c} - z_{nr,nc}}{\Delta x_d}$$
  where $\Delta x_d = \text{cellSize}$ for cardinal neighbors and $\Delta x_d = \sqrt{2} \cdot \text{cellSize}$ for diagonal neighbors.
- **Topological Accumulation:** In-degrees are computed across the grid. Nodes with $\text{in-degree} = 0$ (headwaters and ridges) initialize Kahn's topological sort queue. Each cell adds its cumulative area to its downstream neighbor.

### Step 3: HAND (Height Above Nearest Drainage)
- Cells with $\text{accumulation} \ge \text{accumulationThreshold}$ are labeled as stream channel cells.
- Every non-stream cell follows its D8 flow path downstream until it meets a stream cell $s$.
- The relative elevation is:
  $$\text{HAND}_{r,c} = \max(0, \; z_{r,c} - z_{s})$$
- The stream cell index $s$ is stored as `nearestStreamIndex[i]`.

### Step 4: Source Selection
- Finds the network outlet (maximum accumulation cell).
- Backtracks upstream along the highest-accumulation branch until reaching the origin of that drainage network satisfying the stream threshold.
- User can override with `customSourceCell: [row, col]`.

### Step 5: Flood Route & Arrival Times
- Beginning at the source cell, the route follows downstream D8 flow vectors.
- **Illustrative Speed Formula:**
  Flow speed depends on local channel gradient $S$:
  $$v = \operatorname{clamp}\left(v_{\min} + k \cdot S^{\alpha}, \; v_{\min}, \; v_{\max}\right)$$
- Default parameters: $v_{\min} = 0.8\text{ m/s}$, $v_{\max} = 6.0\text{ m/s}$, $k = 15.0$, $\alpha = 0.5$.
- **Arrival Time:** Cumulative sum of segment travel times $\Delta t = \frac{\Delta x_d}{v}$.

### Step 6: Stage Hydrograph & Downstream Attenuation
- At route cell $j$ with downstream distance $d_j$:
  $$H_{\text{peak}, j} = \max(0, \; H_{\text{source}} - d_j \cdot \lambda)$$
  where $\lambda = \text{stageDecayPerMeter}$.
- For elapsed time since arrival $\tau = t - t_{\text{arrival}, j}$:
  - If $\tau \le 0$: $H(t) = 0$
  - If $0 < \tau \le t_{\text{rise}}$: $H(t) = H_{\text{peak}, j} \cdot \sin\left(\frac{\pi}{2} \cdot \frac{\tau}{t_{\text{rise}}}\right)$
  - If $\tau > t_{\text{rise}}$: $H(t) = H_{\text{peak}, j} \cdot \exp\left(-\frac{\tau - t_{\text{rise}}}{t_{\text{recession}}}\right)$

### Step 7 & 8: Lateral Inundation & Memory Efficiency
- A grid cell $i$ is connected to the flood route if its drainage stream cell $s = \text{nearestStreamIndex}[i]$ is on the active route, and Euclidean lateral distance $d_{\text{lateral}} \le \text{maxLateralDistance}$.
- Flooded condition:
  $$\text{Depth}_i(t) = H_{\text{route}}(t) - \text{HAND}_i > 0.01\text{ m}$$
- **Sparse Representation:** Instead of storing a full dense float grid for every time step ($150 \times 150 \times 48 \text{ steps} \approx 4.3\text{ MB}$), only wet cells are stored as pairs of `Uint32Array` (cell indices) and `Float32Array` (water depths), reducing frame payloads by up to 90%.

---

## 3. Backend Porting Guide (Python / FastAPI / NumPy)

The TypeScript engine is written with zero external libraries and maps 1-to-1 to standard Python / NumPy / SciPy equivalents:

| TypeScript Engine Concept | Python / Backend Equivalent |
|---|---|
| Float32Array 1D buffer | `np.ndarray(dtype=np.float32)` |
| `conditionDem()` | `scipy.ndimage` iterative dilation or `richdem.FillDepressions` |
| `computeD8AndAccumulation()` | NumPy gradient vectorization or `pysheds.grid.Grid.flowdir` |
| `computeHand()` | `pysheds.grid.Grid.distance_to_stream` / topological tracing |
| Sparse Steps | SciPy CSR matrix or JSON-encoded index/depth arrays |
