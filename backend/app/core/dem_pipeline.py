"""
Pure functions for DEM preprocessing and hydrological factor computation.
Every function here is deterministic, side-effect free, and unit-tested.
"""

from typing import Tuple
import numpy as np
from scipy import ndimage


def fill_pits(dem: np.ndarray, epsilon: float = 0.01) -> np.ndarray:
    """
    Hydrologically condition DEM by filling spurious local sinks/pits.
    Enforces that local depressions are raised to the minimum elevation of
    their surrounding spillover boundary plus epsilon.
    """
    filled = np.copy(dem).astype(np.float64)
    # Binary morphology reconstruction for sink filling
    # Initialize a mask with high values everywhere except on the boundary
    marker = np.copy(filled)
    marker[1:-1, 1:-1] = np.inf

    # Iterative priority-flood / geodesic reconstruction
    changed = True
    iterations = 0
    max_iters = 500  # Guard against infinite loops on large grids

    while changed and iterations < max_iters:
        old = np.copy(marker)
        # 3x3 min filter on marker, constrained by filled DEM
        eroded = ndimage.minimum_filter(marker, size=3, mode="nearest")
        marker = np.maximum(filled, eroded)
        changed = not np.allclose(marker, old, atol=1e-5)
        iterations += 1

    return np.maximum(filled, marker)


def compute_slope_and_aspect(
    dem: np.ndarray,
    cell_size_x: float,
    cell_size_y: float,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute slope (degrees) and aspect (azimuth degrees [0, 360]) in projected metric coordinates.
    Uses central differences (Horn's formulation):
      dz/dx = ((c + 2f + i) - (a + 2d + g)) / (8 * cell_size_x)
      dz/dy = ((g + 2h + i) - (a + 2b + c)) / (8 * cell_size_y)
    """
    rows, cols = dem.shape
    dx = max(0.1, float(cell_size_x))
    dy = max(0.1, float(cell_size_y))

    # Sobel kernels: dx (East) and dy (Southwards along rows)
    # Using ndimage.correlate ensures kernel is applied directly without reflection
    kernel_dx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float64) / (8.0 * dx)
    kernel_dy = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float64) / (8.0 * dy)

    dz_dx = ndimage.correlate(dem, kernel_dx, mode="nearest")
    dz_dy = ndimage.correlate(dem, kernel_dy, mode="nearest")

    # Slope in radians: atan(sqrt((dz/dx)^2 + (dz/dy)^2))
    gradient = np.sqrt(dz_dx**2 + dz_dy**2)
    slope_rad = np.arctan(gradient)
    slope_deg = np.degrees(slope_rad)

    # Downslope vector components: v_East = -dz_dx, v_North = dz_dy
    # Standard geographic azimuth clockwise from North (0° = North, 90° = East, 180° = South, 270° = West)
    v_east = -dz_dx
    v_north = dz_dy
    aspect_compass = np.degrees(np.arctan2(v_east, v_north)) % 360.0

    # Flat terrain (slope < 0.05°) assigned 0°
    aspect_compass = np.where(slope_deg < 0.05, 0.0, aspect_compass)

    return slope_deg.astype(np.float32), aspect_compass.astype(np.float32)


def compute_curvature(dem: np.ndarray, cell_size: float) -> np.ndarray:
    """
    Compute Laplacian profile and planform curvature.
    Positive values indicate concave hollows/depressions (convergent flow).
    Negative values indicate convex ridges/crests (divergent flow).
    """
    cs = max(0.1, float(cell_size))
    # 5-point discrete Laplacian stencil
    laplacian_kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float64) / (cs**2)
    curvature = ndimage.convolve(dem, laplacian_kernel, mode="nearest")
    return curvature.astype(np.float32)


def compute_flow_accumulation(dem: np.ndarray) -> np.ndarray:
    """
    Compute D8 flow accumulation (upstream contributing area in cell units).
    Iteratively routes flow from steepest downslope neighbors.
    """
    rows, cols = dem.shape
    accum = np.ones((rows, cols), dtype=np.float64)

    # Sort cell coordinates by elevation descending so high cells flow into lower cells
    flat_indices = np.argsort(-dem.ravel())
    r_idx, c_idx = np.unravel_index(flat_indices, (rows, cols))

    # Neighbor offsets (D8)
    neighbors = [
        (-1, -1, np.sqrt(2)),
        (-1, 0, 1.0),
        (-1, 1, np.sqrt(2)),
        (0, -1, 1.0),
        (0, 1, 1.0),
        (1, -1, np.sqrt(2)),
        (1, 0, 1.0),
        (1, 1, np.sqrt(2)),
    ]

    for r, c in zip(r_idx, c_idx):
        elev = dem[r, c]
        max_drop = 0.0
        best_target = None

        for dr, dc, dist in neighbors:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                drop = (elev - dem[nr, nc]) / dist
                if drop > max_drop:
                    max_drop = drop
                    best_target = (nr, nc)

        if best_target is not None:
            tr, tc = best_target
            accum[tr, tc] += accum[r, c]

    return accum.astype(np.float32)


def compute_topographic_wetness_index(
    dem: np.ndarray,
    slope_deg: np.ndarray,
    flow_accum: np.ndarray,
    cell_size: float,
) -> np.ndarray:
    """
    Compute Topographic Wetness Index (TWI):
      TWI = ln( (A * cell_size) / tan(beta) )
    where A is upstream contributing area in cells and beta is slope in radians.
    """
    cs = max(1.0, float(cell_size))
    slope_rad = np.radians(np.maximum(0.5, slope_deg))  # Minimum slope to avoid div by zero
    tan_slope = np.tan(slope_rad)
    upslope_area = np.maximum(1.0, flow_accum) * cs

    twi = np.log(upslope_area / tan_slope)
    return twi.astype(np.float32)


def compute_relative_elevation(dem: np.ndarray) -> np.ndarray:
    """
    Compute normalized relative elevation (depression predisposition index).
    Lowland valley floor = 1.0 (highest predisposition)
    High ridges/peaks = 0.0
    """
    valid = np.isfinite(dem)
    if not np.any(valid):
        return np.zeros_like(dem, dtype=np.float32)

    min_val = float(np.min(dem[valid]))
    max_val = float(np.max(dem[valid]))
    val_range = max_val - min_val if max_val > min_val else 1.0

    # Invert so lowest elevations have score 1.0
    normalized = 1.0 - (dem - min_val) / val_range
    return np.clip(normalized, 0.0, 1.0).astype(np.float32)
