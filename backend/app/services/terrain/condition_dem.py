"""
Hydrologic conditioning: breach depressions (preferred) with fill fallback.

Uses **pysheds** (not WhiteboxTools): pure pip install, no external binary in Docker,
and integrates directly with NumPy grids used elsewhere in the pipeline.
"""

from __future__ import annotations

import logging

import numpy as np

from app.core.dem_pipeline import fill_pits
from app.services.terrain.grid import DemGrid

logger = logging.getLogger(__name__)


def _condition_with_pysheds(dem: DemGrid, epsilon: float) -> np.ndarray | None:
    try:
        from pysheds.grid import Grid
    except ImportError:
        return None

    data = np.where(np.isfinite(dem.data), dem.data, -1e10)
    grid = Grid(
        affine=dem.transform,
        shape=dem.shape,
        nodata=-1e10,
        crs=dem.crs,
    )
    grid.add_gridded_data(data, data_name="dem", grid_type="float64", overwrite=True)

    try:
        grid.breach_depressions("dem", epsilon=epsilon, max_depth=500.0, flat_increment=epsilon)
        out = grid.view("dem").astype(np.float64)
    except Exception as exc:
        logger.warning("pysheds breach_depressions failed (%s); falling back to fill.", exc)
        try:
            grid.fill_depressions("dem", epsilon=epsilon)
            out = grid.view("dem").astype(np.float64)
        except Exception as fill_exc:
            logger.warning("pysheds fill_depressions failed (%s).", fill_exc)
            return None

    out[out <= -1e9] = np.nan
    invalid = ~np.isfinite(dem.data)
    out[invalid] = np.nan
    return out


def condition_dem(dem: DemGrid, epsilon: float = 0.01) -> DemGrid:
    """Breach depressions when possible; otherwise priority-flood fill (scipy)."""
    breached = _condition_with_pysheds(dem, epsilon=epsilon)
    if breached is not None:
        return dem.copy_with(breached)

    filled = fill_pits(np.where(np.isfinite(dem.data), dem.data, np.nan), epsilon=epsilon)
    return dem.copy_with(filled)
