"""D8 flow direction and flow accumulation."""

from __future__ import annotations

from typing import Tuple

import numpy as np

from app.services.terrain.grid import DemGrid

D8_CODES = (1, 2, 4, 8, 16, 32, 64, 128)
D8_OFFSETS = (
    (0, 1),
    (1, 1),
    (1, 0),
    (1, -1),
    (0, -1),
    (-1, -1),
    (-1, 0),
    (-1, 1),
)
D8_DIST = (1.0, 2**0.5, 1.0, 2**0.5, 1.0, 2**0.5, 1.0, 2**0.5)


def _compute_d8_flow_direction(elev: np.ndarray) -> np.ndarray:
    rows, cols = elev.shape
    flow_dir = np.zeros((rows, cols), dtype=np.uint8)

    best = np.full_like(elev, -1.0)
    best_code = np.zeros((rows, cols), dtype=np.uint8)

    for (dr, dc), dist, code in zip(D8_OFFSETS, D8_DIST, D8_CODES):
        neighbor = np.full_like(elev, np.nan)
        r_sl = slice(max(0, dr), rows + min(0, dr))
        c_sl = slice(max(0, dc), cols + min(0, dc))
        nr_sl = slice(max(0, -dr), rows - max(0, dr))
        nc_sl = slice(max(0, -dc), cols - max(0, dc))
        neighbor[r_sl, c_sl] = elev[nr_sl, nc_sl]
        drop = (elev - neighbor) / dist
        update = drop > 0
        stacked_drop = np.where(update, drop, -1.0)
        better = stacked_drop > best
        best = np.where(better, stacked_drop, best)
        best_code = np.where(better, code, best_code).astype(np.uint8)

    flow_dir = best_code
    return flow_dir


def flow_direction_accumulation(dem: DemGrid) -> Tuple[DemGrid, DemGrid]:
    """Return D8 flow-direction (ESRI codes) and upstream cell accumulation."""
    elev = np.where(np.isfinite(dem.data), dem.data, -1e10)
    flow_dir = _compute_d8_flow_direction(elev)

    rows, cols = elev.shape
    accum = np.ones((rows, cols), dtype=np.float64)
    order = np.argsort(-elev.ravel())
    r_idx, c_idx = np.unravel_index(order, elev.shape)

    offset_by_code = {code: off for code, off in zip(D8_CODES, D8_OFFSETS)}
    for r, c in zip(r_idx, c_idx):
        code = int(flow_dir[r, c])
        if code == 0:
            continue
        dr, dc = offset_by_code[code]
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            accum[nr, nc] += accum[r, c]

    accum = accum.astype(np.float32)
    accum[~np.isfinite(dem.data)] = np.nan
    flow_dir_out = flow_dir.astype(np.float32)
    flow_dir_out[~np.isfinite(dem.data)] = np.nan

    return dem.copy_with(flow_dir_out), dem.copy_with(accum)
