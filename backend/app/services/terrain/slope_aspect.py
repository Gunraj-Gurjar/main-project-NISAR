"""Slope and aspect from DEM (degrees)."""

from __future__ import annotations

from typing import Tuple

import numpy as np
from scipy import ndimage

from app.services.terrain.grid import DemGrid


def slope_aspect(dem: DemGrid) -> Tuple[DemGrid, DemGrid]:
    """
    Compute slope (degrees) and aspect (0–360°, clockwise from north) using Horn-style gradients.
    """
    arr = np.where(np.isfinite(dem.data), dem.data, np.nanmean(dem.data))
    dx = max(0.1, dem.cell_size_x)
    dy = max(0.1, dem.cell_size_y)

    kernel_dx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float64) / (8.0 * dx)
    kernel_dy = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float64) / (8.0 * dy)

    dz_dx = ndimage.correlate(arr, kernel_dx, mode="nearest")
    dz_dy = ndimage.correlate(arr, kernel_dy, mode="nearest")

    gradient = np.sqrt(dz_dx**2 + dz_dy**2)
    slope_deg = np.degrees(np.arctan(gradient)).astype(np.float32)

    v_east = -dz_dx
    v_north = dz_dy
    aspect_deg = (np.degrees(np.arctan2(v_east, v_north)) % 360.0).astype(np.float32)
    aspect_deg = np.where(slope_deg < 0.05, 0.0, aspect_deg)

    return dem.copy_with(slope_deg), dem.copy_with(aspect_deg)
