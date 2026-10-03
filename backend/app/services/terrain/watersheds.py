"""Watershed delineation from D8 flow direction."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from rasterio import features

from app.services.terrain.flow import D8_CODES, D8_OFFSETS
from app.services.terrain.grid import DemGrid

OFFSET_BY_CODE = {code: off for code, off in zip(D8_CODES, D8_OFFSETS)}


def _downstream_cell(r: int, c: int, code: int, rows: int, cols: int) -> Tuple[int, int] | None:
    if code not in OFFSET_BY_CODE:
        return None
    dr, dc = OFFSET_BY_CODE[code]
    nr, nc = r + dr, c + dc
    if 0 <= nr < rows and 0 <= nc < cols:
        return nr, nc
    return None


def _auto_outlet(flow_accum: np.ndarray, stream_mask: np.ndarray) -> Tuple[int, int]:
    masked = np.where(stream_mask, flow_accum, -np.inf)
    if np.any(np.isfinite(masked) & (masked > -np.inf)):
        idx = np.nanargmax(masked)
        return np.unravel_index(idx, flow_accum.shape)
    idx = np.nanargmax(flow_accum)
    return np.unravel_index(idx, flow_accum.shape)


def delineate_watersheds(
    flow_dir: DemGrid,
    flow_accum: DemGrid,
    stream_mask: np.ndarray,
    pour_points: Optional[List[Tuple[float, float]]] = None,
) -> Dict[str, Any]:
    """
    Delineate basin polygon(s). Auto mode uses the highest-accumulation stream cell as outlet.
    Optional pour_points are (x, y) in map coordinates.
    """
    rows, cols = flow_dir.shape
    fdir = flow_dir.data.astype(np.int32)
    accum = flow_accum.data

    outlets: List[Tuple[int, int]] = []
    if pour_points:
        from rasterio.transform import rowcol

        for x, y in pour_points:
            r, c = rowcol(flow_dir.transform, x, y)
            if 0 <= r < rows and 0 <= c < cols:
                outlets.append((int(r), int(c)))
    else:
        outlets = [_auto_outlet(accum, stream_mask)]

    features_out: List[Dict[str, Any]] = []
    for basin_id, (orow, ocol) in enumerate(outlets):
        basin = np.zeros((rows, cols), dtype=bool)
        stack = [(orow, ocol)]
        basin[orow, ocol] = True

        while stack:
            r, c = stack.pop()
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if not (0 <= nr < rows and 0 <= nc < cols) or basin[nr, nc]:
                        continue
                    code = int(fdir[nr, nc])
                    down = _downstream_cell(nr, nc, code, rows, cols)
                    if down == (r, c):
                        basin[nr, nc] = True
                        stack.append((nr, nc))

        for geom, val in features.shapes(
            basin.astype(np.uint8),
            mask=basin,
            transform=flow_dir.transform,
        ):
            if int(val) == 1:
                features_out.append(
                    {
                        "type": "Feature",
                        "properties": {"basin_id": basin_id, "outlet_row": orow, "outlet_col": ocol},
                        "geometry": geom,
                    }
                )

    return {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": flow_dir.crs}},
        "features": features_out,
    }
