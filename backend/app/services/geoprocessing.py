from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from scipy import ndimage

from app.core.config import settings
from app.models.schemas import (
    AnalysisConfig,
    ExplainableBreakdown,
    FactorContribution,
    SusceptibilityZoneSummary,
)


def fill_pits(dem: np.ndarray, epsilon: float = 0.01) -> np.ndarray:
    """Hydrological pit filling / sink conditioning."""
    filled = np.copy(dem).astype(np.float64)
    marker = np.copy(filled)
    marker[1:-1, 1:-1] = np.inf

    changed = True
    iterations = 0
    while changed and iterations < 300:
        old = np.copy(marker)
        eroded = ndimage.minimum_filter(marker, size=3, mode="nearest")
        marker = np.maximum(filled, eroded)
        changed = not np.allclose(marker, old, atol=1e-5)
        iterations += 1

    return np.maximum(filled, marker)


def compute_slope_and_aspect(
    dem: np.ndarray,
    dx: float,
    dy: float,
) -> Tuple[np.ndarray, np.ndarray]:
    """Compute slope (degrees) and compass aspect (0-360) using Sobel central differences."""
    cs_x = max(0.1, float(abs(dx)))
    cs_y = max(0.1, float(abs(dy)))

    kernel_dx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float64) / (8.0 * cs_x)
    kernel_dy = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float64) / (8.0 * cs_y)

    dz_dx = ndimage.correlate(dem, kernel_dx, mode="nearest")
    dz_dy = ndimage.correlate(dem, kernel_dy, mode="nearest")

    gradient = np.sqrt(dz_dx**2 + dz_dy**2)
    slope_deg = np.degrees(np.arctan(gradient))

    # Azimuth clockwise from North
    v_east = -dz_dx
    v_north = dz_dy
    aspect_compass = np.degrees(np.arctan2(v_east, v_north)) % 360.0
    aspect_compass = np.where(slope_deg < 0.05, 0.0, aspect_compass)

    return slope_deg.astype(np.float32), aspect_compass.astype(np.float32)


def compute_curvature(dem: np.ndarray, cell_size: float) -> np.ndarray:
    """Laplacian curvature: positive = concave hollow, negative = convex crest."""
    cs = max(0.1, float(abs(cell_size)))
    kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float64) / (cs**2)
    curvature = ndimage.correlate(dem, kernel, mode="nearest")
    return curvature.astype(np.float32)


def compute_flow_accumulation(dem: np.ndarray) -> np.ndarray:
    """D8 flow routing accumulation."""
    rows, cols = dem.shape
    accum = np.ones((rows, cols), dtype=np.float64)
    flat_indices = np.argsort(-dem.ravel())
    r_idx, c_idx = np.unravel_index(flat_indices, (rows, cols))

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
        best = None
        for dr, dc, dist in neighbors:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                drop = (elev - dem[nr, nc]) / dist
                if drop > max_drop:
                    max_drop = drop
                    best = (nr, nc)
        if best is not None:
            accum[best[0], best[1]] += accum[r, c]

    return accum.astype(np.float32)


def compute_topographic_wetness_index(
    dem: np.ndarray,
    slope_deg: np.ndarray,
    flow_accum: np.ndarray,
    cell_size: float,
) -> np.ndarray:
    """Topographic Wetness Index: ln(a / tan beta)."""
    cs = max(1.0, float(abs(cell_size)))
    slope_rad = np.radians(np.maximum(0.5, slope_deg))
    upslope_area = np.maximum(1.0, flow_accum) * cs
    twi = np.log(upslope_area / np.tan(slope_rad))
    return twi.astype(np.float32)


def normalize_01(arr: np.ndarray) -> np.ndarray:
    valid = np.isfinite(arr)
    if not np.any(valid):
        return np.zeros_like(arr, dtype=np.float32)
    min_v = float(np.min(arr[valid]))
    max_v = float(np.max(arr[valid]))
    diff = max_v - min_v if max_v > min_v else 1.0
    return np.clip((arr - min_v) / diff, 0.0, 1.0).astype(np.float32)


def run_pipeline(
    dem: np.ndarray,
    res_x: float,
    res_y: float,
    config: Optional[AnalysisConfig] = None,
) -> Tuple[Dict[str, np.ndarray], ExplainableBreakdown]:
    """Execute complete explainable terrain susceptibility screening pipeline."""
    # 1. Conditioning
    filled = fill_pits(dem)

    # 2. Factors
    slope_deg, aspect_deg = compute_slope_and_aspect(filled, res_x, res_y)
    curvature = compute_curvature(filled, res_x)
    accum = compute_flow_accumulation(filled)
    twi = compute_topographic_wetness_index(filled, slope_deg, accum, res_x)

    # Relative elevation (lowlands = 1.0)
    rel_elev = 1.0 - normalize_01(filled)

    # Slope flatness factor (<3 deg flat = 1.0)
    flatness = np.ones_like(slope_deg, dtype=np.float32)
    steep_mask = slope_deg > 3.0
    flatness[steep_mask] = 1.0 - (slope_deg[steep_mask] - 3.0) / 32.0
    flatness = np.clip(flatness, 0.0, 1.0)

    norm_curv = normalize_01(curvature)
    norm_twi = normalize_01(twi)

    # Weights
    w_elev = config.relative_elevation_weight if (config and config.relative_elevation_weight is not None) else settings.susceptibility_weights.relative_elevation
    w_slope = config.slope_flatness_weight if (config and config.slope_flatness_weight is not None) else settings.susceptibility_weights.slope_flatness
    w_curv = config.curvature_concavity_weight if (config and config.curvature_concavity_weight is not None) else settings.susceptibility_weights.curvature_concavity
    w_twi = config.topographic_wetness_weight if (config and config.topographic_wetness_weight is not None) else settings.susceptibility_weights.topographic_wetness

    w_sum = w_elev + w_slope + w_curv + w_twi or 1.0
    w_elev, w_slope, w_curv, w_twi = w_elev/w_sum, w_slope/w_sum, w_curv/w_sum, w_twi/w_sum

    # Susceptibility
    susceptibility = (
        w_elev * rel_elev
        + w_slope * flatness
        + w_curv * norm_curv
        + w_twi * norm_twi
    )
    susceptibility = np.clip(susceptibility, 0.0, 1.0).astype(np.float32)

    # Explainable Breakdown
    total_cells = susceptibility.size
    vhigh_mask = susceptibility >= settings.susceptibility_thresholds.very_high
    high_mask = (susceptibility >= settings.susceptibility_thresholds.high) & ~vhigh_mask
    mod_mask = (susceptibility >= settings.susceptibility_thresholds.moderate) & ~(vhigh_mask | high_mask)
    low_mask = susceptibility < settings.susceptibility_thresholds.moderate

    def make_zone(label: str, mask: np.ndarray) -> SusceptibilityZoneSummary:
        c = int(np.sum(mask))
        pct = (c / total_cells) * 100.0 if total_cells > 0 else 0.0
        m = float(np.mean(susceptibility[mask])) if c > 0 else 0.0
        return SusceptibilityZoneSummary(
            zone_label=label,
            pixel_count=c,
            area_percentage=round(pct, 2),
            mean_susceptibility_score=round(m, 3),
        )

    zones = [
        make_zone("Very High", vhigh_mask),
        make_zone("High", high_mask),
        make_zone("Moderate", mod_mask),
        make_zone("Low", low_mask),
    ]

    factor_contribs = [
        FactorContribution(
            factor_name="Relative Elevation",
            weight=round(w_elev, 3),
            mean_score=round(float(np.mean(rel_elev)), 3),
            contribution_percentage=round(w_elev * 100, 1),
            description="Lowlands predisposition to stormwater pooling",
        ),
        FactorContribution(
            factor_name="Slope Flatness",
            weight=round(w_slope, 3),
            mean_score=round(float(np.mean(flatness)), 3),
            contribution_percentage=round(w_slope * 100, 1),
            description="Gentle slopes limit overland drainage velocity",
        ),
        FactorContribution(
            factor_name="Curvature Concavity",
            weight=round(w_curv, 3),
            mean_score=round(float(np.mean(norm_curv)), 3),
            contribution_percentage=round(w_curv * 100, 1),
            description="Concave depressions collect convergent flow",
        ),
        FactorContribution(
            factor_name="Topographic Wetness Index",
            weight=round(w_twi, 3),
            mean_score=round(float(np.mean(norm_twi)), 3),
            contribution_percentage=round(w_twi * 100, 1),
            description="Hydrological moisture accumulation equilibrium",
        ),
    ]

    vhigh_count = int(np.sum(vhigh_mask))
    high_count = int(np.sum(high_mask))
    mod_count = int(np.sum(mod_mask))

    breakdown = ExplainableBreakdown(
        zones=zones,
        factor_contributions=factor_contribs,
        high_susceptibility_percentage=round(((vhigh_count + high_count) / total_cells) * 100.0, 2),
        moderate_susceptibility_percentage=round((mod_count / total_cells) * 100.0, 2),
    )

    layers = {
        "susceptibility": susceptibility,
        "slope": slope_deg,
        "curvature": curvature,
        "twi": twi,
        "relative_elevation": rel_elev,
    }

    return layers, breakdown


def write_layer_cog(
    output_path: Path,
    array: np.ndarray,
    bounds: Tuple[float, float, float, float],
    crs_str: str,
    nodata: float = -9999.0,
) -> Path:
    """Save layer as a tiled GeoTIFF / COG."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    rows, cols = array.shape
    minx, miny, maxx, maxy = bounds
    transform = from_bounds(minx, miny, maxx, maxy, cols, rows)

    with rasterio.open(
        output_path,
        "w",
        driver="GTiff",
        height=rows,
        width=cols,
        count=1,
        dtype=rasterio.float32,
        crs=crs_str,
        transform=transform,
        nodata=nodata,
        tiled=True,
        blockxsize=256,
        blockysize=256,
        compress="deflate",
    ) as dst:
        dst.write(array.astype(np.float32), 1)

    return output_path
