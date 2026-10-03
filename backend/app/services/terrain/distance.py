"""Distance to nearest stream cell."""

from __future__ import annotations

import numpy as np
from scipy import ndimage

from app.services.terrain.grid import DemGrid


def distance_to_stream(streams: DemGrid) -> DemGrid:
    """Euclidean distance (metres) to nearest stream pixel."""
    mask = np.isfinite(streams.data) & (streams.data >= 0.5)
    if not np.any(mask):
        dist = np.full(streams.shape, np.nan, dtype=np.float32)
        return streams.copy_with(dist)

    dist_cells = ndimage.distance_transform_edt(~mask)
    dist_m = (dist_cells * streams.cell_size).astype(np.float32)
    dist_m[~np.isfinite(streams.data)] = np.nan
    return streams.copy_with(dist_m)
