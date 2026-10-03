"""Write terrain outputs as COGs and GeoJSON under /data/jobs/{job_id}/."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

import numpy as np
import rasterio
from rasterio.transform import from_bounds

from app.services.terrain.grid import DemGrid


def job_output_dir(base_storage: Path, job_id: str) -> Path:
    out = base_storage / "jobs" / job_id
    out.mkdir(parents=True, exist_ok=True)
    return out


def write_cog(grid: DemGrid, output_path: Path, nodata: float = -9999.0) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    rows, cols = grid.shape
    minx, miny, maxx, maxy = grid.bounds
    transform = from_bounds(minx, miny, maxx, maxy, cols, rows)
    data = np.where(np.isfinite(grid.data), grid.data, nodata).astype(np.float32)

    with rasterio.open(
        output_path,
        "w",
        driver="GTiff",
        height=rows,
        width=cols,
        count=1,
        dtype=rasterio.float32,
        crs=grid.crs,
        transform=transform,
        nodata=nodata,
        tiled=True,
        blockxsize=256,
        blockysize=256,
        compress="deflate",
    ) as dst:
        dst.write(data, 1)
        dst.update_tags(1, LAYER_TYPE="terrain_cog")

    return output_path


def write_geojson(geojson: Dict, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(geojson), encoding="utf-8")
    return output_path
