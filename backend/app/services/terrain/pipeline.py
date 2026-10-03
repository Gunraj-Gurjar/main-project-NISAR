"""Orchestrates terrain analysis steps and writes job outputs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.models.schemas import AnalysisConfig, DemMetadata
from app.services.terrain.condition_dem import condition_dem
from app.services.terrain.distance import distance_to_stream
from app.services.terrain.flow import flow_direction_accumulation
from app.services.terrain.hand import hand
from app.services.terrain.io import job_output_dir, write_cog, write_geojson
from app.services.terrain.preprocess import preprocess
from app.services.terrain.provenance import build_job_provenance
from app.services.terrain.slope_aspect import slope_aspect
from app.services.terrain.stats import terrain_stats
from app.services.terrain.streams import extract_streams
from app.services.terrain.twi import twi
from app.services.terrain.watersheds import delineate_watersheds


def run_terrain_pipeline(
    job_id: str,
    raw_dem_path: Path,
    metadata: DemMetadata,
    storage_base: Path,
    config: Optional[AnalysisConfig] = None,
    aoi_bounds: Optional[Tuple[float, float, float, float]] = None,
) -> Tuple[List[str], Dict[str, Any]]:
    """
    Execute terrain steps 1–10 and write COGs / GeoJSON to storage_base/jobs/{job_id}/.
    Returns output layer names and provenance document.
    """
    out_dir = job_output_dir(storage_base, job_id)

    dem, preprocess_meta = preprocess(
        raw_dem_path,
        input_crs=metadata.crs,
        bounds_wgs84_or_projected=metadata.bounds,
        aoi_bounds=aoi_bounds,
    )

    dem_cond = condition_dem(dem, epsilon=settings.hydrology.pit_fill_epsilon_m)
    slope_g, aspect_g = slope_aspect(dem_cond)
    flow_dir, flow_acc = flow_direction_accumulation(dem_cond)

    threshold_cells = settings.hydrology.flow_accumulation_threshold
    threshold_km2 = getattr(settings.hydrology, "stream_threshold_km2", None)
    streams_g, streams_geojson = extract_streams(
        flow_acc,
        threshold_cells=threshold_cells,
        threshold_km2=threshold_km2,
    )
    stream_mask = streams_g.data >= 0.5
    basins_geojson = delineate_watersheds(flow_dir, flow_acc, stream_mask)
    hand_g = hand(dem_cond, streams_g, flow_dir, flow_acc)
    twi_g = twi(slope_g, flow_acc, dem_cond.cell_size)
    dist_g = distance_to_stream(streams_g)
    stats = terrain_stats(dem_cond)

    raster_layers = {
        "dem_conditioned": dem_cond,
        "slope": slope_g,
        "aspect": aspect_g,
        "flow_acc": flow_acc,
        "streams": streams_g,
        "hand": hand_g,
        "twi": twi_g,
        "dist_stream": dist_g,
    }

    layer_names: List[str] = []
    for name, grid in raster_layers.items():
        write_cog(grid, out_dir / f"{name}.tif")
        layer_names.append(name)

    write_geojson(streams_geojson, out_dir / "streams.geojson")
    write_geojson(basins_geojson, out_dir / "basins.geojson")
    layer_names.extend(["streams_geojson", "basins"])

    pipeline_params = {
        "pit_fill_epsilon_m": settings.hydrology.pit_fill_epsilon_m,
        "flow_accumulation_threshold_cells": threshold_cells,
        "stream_threshold_km2": threshold_km2,
        "analysis_config": config.model_dump() if config else None,
        "conditioning": "pysheds_breach_with_fill_fallback",
    }
    provenance = build_job_provenance(
        job_id=job_id,
        preprocess_meta=preprocess_meta,
        pipeline_parameters=pipeline_params,
        terrain_stats=stats,
    )
    (out_dir / "provenance.json").write_text(json.dumps(provenance, indent=2), encoding="utf-8")
    layer_names.append("provenance")

    return layer_names, provenance
