# Illustrative Flood Simulation Engine Documentation

This document describes the pure numerical, topological, and hydrological algorithms implemented in `src/lib/flood-sim/` for illustrative terrain-based scenario simulation and replay on sample DEMs.

> [!IMPORTANT]
> **Mandatory Scientific Guardrails Notice:**
> The simulation is an **illustrative scenario demonstration** on sample terrain. It is **not a real event, flood forecast, early warning alert, or hydraulic prediction**.
> All speeds, stage heights, wave arrival times, and decay coefficients are illustrative scenario defaults derived from morphological proxies.

---

## 1. Algorithmic Pipeline Overview

The pipeline executes entirely deterministically without external libraries or stochastic drift:

```
[Raw DEM Raster (Float32Array)]
              │
              ▼
   Step 1: Pit Conditioning (Spillway Filling with maxPitFillDepth guard)
              │
              ▼
   Step 2: D8 Flow Direction & Topological Accumulation (Kahn's Algorithm)
              │
              ▼
   Step 3: HAND (Height Above Nearest Drainage) & Drainage Basin Mapping
              │
              ▼
   Step 4: Source Selection (Headwater of main channel or user-picked cell)
              │
              ▼
   Step 5: Route Construction & Illustrative Slope-Dependent Speed Routing
              │
              ▼
   Step 6: Stage Hydrograph (Smooth rise + exponential recession with distance decay)
              │
              ▼
   Step 7: Lateral Inundation Mapping (Depth = Stage - HAND within lateral threshold)
              │
              ▼
   Step 8: Sparse Frame Serialization (Uint32 indices + Float32 depths)
```

---

## 2. Mathematical Formulations & Steps

### Step 1: DEM Conditioning
- **Method:** Iterative priority filling of local elevation minima.
- **Guard:** If filling exceeds `maxPitFillDepth` (default: `100.0 m`), the elevation delta is clamped to prevent filling natural alpine gorges or glacial cirques:
  $$z_{\text{target}} = \min\left(\min_{d \in D8} z_{\text{neighbor}}, \; z_{\text{raw}} + \text{maxPitFillDepth}\right)$$

### Step 2: D8 Flow Direction & Flow Accumulation
- **D8 Direction:** Steepest descent neighbor direction among 8 adjacent cells:
  $$S_d = \frac{z_{r, c} - z_{nr, nc}}{\Delta x_d}$$
  where $\Delta x_d = \text{cellSize}$ for cardinal steps and $\sqrt{2} \cdot \text{cellSize}$ for diagonal steps.
- **Accumulation:** Computed using Kahn's topological sort starting from ridge cells ($\text{in-degree} = 0$).

### Step 3: HAND (Height Above Nearest Drainage)
- Cells with $\text{accumulation} \ge \text{accumulationThreshold}$ represent the active drainage channel network.
- For non-stream cells, the algorithm follows the D8 streamline downstream until reaching a stream cell $s$:
  $$\text{HAND}_{r,c} = \max\left(0, \; z_{r,c} - z_s\right)$$

### Step 4: Source Selection
- Traces backwards from the global basin outlet along the branch of highest contributing drainage area to isolate the true headwater cell of the primary river channel.
- User can override source placement by clicking directly on any stream cell in the 3D viewport.

### Step 5: Route & Illustrative Flow Speed
- The flood route follows D8 downstream from the source cell.
- **Illustrative Speed Formula:** Flow velocity $v$ scales with local channel slope $S$:
  $$v = \operatorname{clamp}\left(v_{\min} + k \cdot S^{\alpha}, \; v_{\min}, \; v_{\max}\right)$$
  *(Documented as illustrative: default $v_{\min} = 0.8\text{ m/s}$, $v_{\max} = 6.0\text{ m/s}$, $k = 15.0$, $\alpha = 0.5$)*.
- **Arrival Time:** Cumulative segment travel time $\Delta t = \frac{\Delta x_d}{v}$.

### Step 6: Stage Hydrograph & Downstream Attenuation
- At route cell $j$ at downstream distance $d_j$:
  $$H_{\text{peak}, j} = \max\left(0, \; H_{\text{source}} - d_j \cdot \lambda\right)$$
  where $\lambda = \text{stageDecayPerMeter}$ (default: $0.0004\text{ m/m}$).
- Instantaneous stage at elapsed time $\tau = t - t_{\text{arrival}, j}$:
  $$H(t) = \begin{cases} 
    0 & \tau \le 0 \\
    H_{\text{peak}, j} \cdot \sin\left(\frac{\pi}{2} \cdot \frac{\tau}{t_{\text{rise}}}\right) & 0 < \tau \le t_{\text{rise}} \\
    H_{\text{peak}, j} \cdot \exp\left(-\frac{\tau - t_{\text{rise}}}{t_{\text{recession}}}\right) & \tau > t_{\text{rise}}
  \end{cases}$$

### Step 7 & 8: Lateral Inundation & Sparse Memory Storage
- For cell $i$ whose nearest drainage cell is on the active flood route within $d_{\text{lateral}} \le \text{maxLateralDistance}$:
  $$\text{Depth}_i(t) = H_{\text{route}}(t) - \text{HAND}_i > 0.01\text{ m}$$
- To ensure optimal performance and low memory footprints ($< 1\text{MB}$ total), each time frame stores only wet cells via typed `Uint32Array` indices and `Float32Array` depths.

---

## 3. Configurable Parameters & Defaults

| Parameter | Type | Default | Description |
|---|---|---|---|
| `cellSizeMeters` | `number` | `30.0` | Spatial raster cell resolution in meters. |
| `accumulationThreshold` | `number` | `15` | Minimum upstream cell count to designate a drainage stream. |
| `maxPitFillDepth` | `number` | `100.0` | Maximum vertical fill depth (m) for depression conditioning. |
| `sourcePeakStageMeters` | `number` | `10.0` | Peak flood stage above channel bed (m) at release point. |
| `stageDecayPerMeter` | `number` | `0.0004` | Downstream stage attenuation coefficient. |
| `hydrographRiseSeconds` | `number` | `1200` | Hydrograph rise time (20 minutes). |
| `hydrographRecessionSeconds` | `number` | `3600` | Exponential recession half-life constant (60 minutes). |
| `minFlowSpeed` | `number` | `0.8` | Illustrative baseline channel speed (m/s). |
| `maxFlowSpeed` | `number` | `6.0` | Illustrative maximum speed cap (m/s). |
| `maxLateralDistanceMeters` | `number` | `600.0` | Maximum lateral spread radius from active route. |
| `timeStepSeconds` | `number` | `120` | Output frame duration interval (2 minutes). |
| `totalDurationSeconds` | `number` | `7200` | Full scenario duration (2 hours). |

---

## 4. Key Modeling Limitations

1. **Not a Calibrated Hydrodynamic Solver:** Does not solve 2D shallow-water Saint-Venant equations, momentum conservation, or dynamic backwater curves.
2. **Terrain-Only Proxy:** Driven by static DEM morphology without rainfall, radar rainfall inputs, infiltration, Manning's roughness grids, or soil saturation state.
3. **Resolution Dependent:** Streamline accuracy is bounded by the underlying DEM grid resolution and interpolation quality.
4. **Illustrative Velocities:** Propagation speeds and hydrographs provide visual scenario exploration and must not be used for emergency evacuation planning or operational warnings.
