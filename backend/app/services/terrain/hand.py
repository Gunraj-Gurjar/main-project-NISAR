"""Height Above Nearest Drainage (HAND)."""

from __future__ import annotations

import numpy as np

from app.services.terrain.flow import D8_CODES, D8_OFFSETS
from app.services.terrain.grid import DemGrid

OFFSET_BY_CODE = {code: off for code, off in zip(D8_CODES, D8_OFFSETS)}


def hand(
    dem_conditioned: DemGrid,
    stream_raster: DemGrid,
    flow_dir: DemGrid,
    flow_accum: DemGrid,
) -> DemGrid:
    """
    HAND via downstream accumulation order: stream cells = 0 m,
    upstream HAND = elev(cell) - elev(downstream) + HAND(downstream).
    """
    elev = dem_conditioned.data
    streams = stream_raster.data >= 0.5
    fdir = flow_dir.data.astype(np.int32)
    rows, cols = elev.shape

    hand_arr = np.full((rows, cols), np.nan, dtype=np.float32)
    hand_arr[streams & np.isfinite(elev)] = 0.0

    acc = np.where(np.isfinite(flow_accum.data), flow_accum.data, 0.0)
    # High accumulation downstream is processed before upstream tributaries.
    order = np.argsort(-acc.ravel())
    r_idx, c_idx = np.unravel_index(order, (rows, cols))

    for r, c in zip(r_idx, c_idx):
        if not np.isfinite(elev[r, c]):
            continue
        if streams[r, c]:
            hand_arr[r, c] = 0.0
            continue
        code = int(fdir[r, c])
        if code not in OFFSET_BY_CODE:
            hand_arr[r, c] = 0.0
            continue
        dr, dc = OFFSET_BY_CODE[code]
        nr, nc = r + dr, c + dc
        if not (0 <= nr < rows and 0 <= nc < cols):
            hand_arr[r, c] = 0.0
            continue
        down_hand = hand_arr[nr, nc]
        if not np.isfinite(down_hand):
            down_hand = 0.0
        hand_arr[r, c] = max(0.0, float(elev[r, c] - elev[nr, nc] + down_hand))

    return dem_conditioned.copy_with(hand_arr.astype(np.float32))
