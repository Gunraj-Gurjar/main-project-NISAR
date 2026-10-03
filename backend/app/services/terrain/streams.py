"""Stream extraction from flow accumulation."""

from __future__ import annotations

from typing import Any, Dict, Tuple

import numpy as np
from rasterio import features

from app.services.terrain.grid import DemGrid


def _accumulation_threshold_cells(
    threshold_cells: int,
    threshold_km2: float | None,
    cell_size_m: float,
) -> int:
    if threshold_km2 is not None and threshold_km2 > 0:
        area_m2 = threshold_km2 * 1_000_000.0
        return max(1, int(round(area_m2 / (cell_size_m**2))))
    return max(1, int(threshold_cells))


def extract_streams(
    accumulation: DemGrid,
    threshold_cells: int = 100,
    threshold_km2: float | None = None,
) -> Tuple[DemGrid, Dict[str, Any]]:
    """
    Threshold flow accumulation to a stream raster and vectorize to GeoJSON (EPSG coordinates).
    """
    thresh = _accumulation_threshold_cells(threshold_cells, threshold_km2, accumulation.cell_size)
    acc = accumulation.data
    stream_mask = np.isfinite(acc) & (acc >= float(thresh))
    stream_raster = stream_mask.astype(np.float32)

    shapes = []
    for geom, val in features.shapes(
        stream_raster.astype(np.uint8),
        mask=stream_mask,
        transform=accumulation.transform,
    ):
        if int(val) == 1:
            shapes.append({"type": "Feature", "properties": {"stream": True}, "geometry": geom})

    geojson: Dict[str, Any] = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": accumulation.crs}},
        "features": shapes,
    }
    return accumulation.copy_with(stream_raster), geojson
