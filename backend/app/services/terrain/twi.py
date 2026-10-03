"""Topographic Wetness Index."""

from __future__ import annotations

import numpy as np

from app.services.terrain.grid import DemGrid


def twi(
    slope: DemGrid,
    accumulation: DemGrid,
    cell_size: float,
    min_slope_deg: float = 0.5,
) -> DemGrid:
    """TWI = ln((A * cell_size) / tan(beta)) with safe minimum slope."""
    cs = max(0.1, float(cell_size))
    slope_deg = np.where(np.isfinite(slope.data), slope.data, min_slope_deg)
    slope_rad = np.radians(np.maximum(min_slope_deg, slope_deg))
    tan_beta = np.tan(slope_rad)
    tan_beta = np.maximum(tan_beta, 1e-6)

    acc = np.where(np.isfinite(accumulation.data), accumulation.data, 1.0)
    upslope_area_m = np.maximum(1.0, acc) * cs

    twi_arr = np.log(upslope_area_m / tan_beta).astype(np.float32)
    twi_arr[~np.isfinite(slope.data)] = np.nan
    return slope.copy_with(twi_arr)
