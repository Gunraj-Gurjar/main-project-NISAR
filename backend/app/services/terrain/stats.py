"""Terrain elevation statistics."""

from __future__ import annotations

from typing import Any, Dict, List

import numpy as np

from app.services.terrain.grid import DemGrid


def terrain_stats(dem: DemGrid, histogram_bins: int = 20) -> Dict[str, Any]:
    """Summary stats and elevation histogram for valid DEM cells."""
    valid = dem.data[np.isfinite(dem.data)]
    if valid.size == 0:
        return {
            "min": None,
            "max": None,
            "mean": None,
            "std": None,
            "percentiles": {},
            "histogram": {"counts": [], "bin_edges": []},
        }

    percentiles = [5, 25, 50, 75, 95]
    pct_values = {f"p{p}": float(np.percentile(valid, p)) for p in percentiles}
    counts, bin_edges = np.histogram(valid, bins=histogram_bins)

    return {
        "min": float(np.min(valid)),
        "max": float(np.max(valid)),
        "mean": float(np.mean(valid)),
        "std": float(np.std(valid)),
        "percentiles": pct_values,
        "histogram": {
            "counts": counts.astype(int).tolist(),
            "bin_edges": bin_edges.astype(float).tolist(),
        },
    }
