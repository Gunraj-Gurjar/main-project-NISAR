"""
Background Geoprocessing Worker.
Executes pure pipeline functions asynchronously, persists COG to storage,
and updates job status in the database with complete provenance metadata.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Tuple
import numpy as np

from app.config import settings
from app.core.cog_writer import save_as_cog
from app.core.crs_utils import determine_utm_crs
from app.core.dem_pipeline import (
    compute_curvature,
    compute_flow_accumulation,
    compute_relative_elevation,
    compute_slope_and_aspect,
    compute_topographic_wetness_index,
    fill_pits,
)
from app.core.provenance import build_provenance_record
from app.core.susceptibility import compute_explainable_susceptibility
from app.db.database import SessionLocal
from app.db.models import JobRecord
from app.storage import storage


def read_dem_raster(file_path: Path) -> Tuple[np.ndarray, str, float]:
    """
    Read DEM raster array from file.
    Returns (dem_array, crs_string, resolution_m).
    """
    try:
        import rasterio

        with rasterio.open(file_path) as src:
            dem = src.read(1).astype(np.float64)
            nodata = src.nodata
            if nodata is not None:
                dem[dem == nodata] = np.nan
            crs_str = str(src.crs) if src.crs else "EPSG:4326"
            res_x, res_y = src.res
            resolution_m = float((abs(res_x) + abs(res_y)) / 2.0)
            # If coordinates are in degrees (WGS84), approximate to ~30m
            if resolution_m < 0.1:
                resolution_m = 30.0
            return dem, crs_str, resolution_m
    except ImportError:
        import tifffile

        dem = tifffile.imread(file_path).astype(np.float64)
        if dem.ndim == 3:
            dem = dem[0]
        # Clean invalid values
        dem[(dem < -500) | (dem > 9000)] = np.nan
        return dem, "EPSG:4326 (Local/Default)", 30.0


def process_screening_job(job_id: str, file_path_str: str, original_filename: str):
    """
    Main background geoprocessing execution function.
    """
    db = SessionLocal()
    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    if not job:
        db.close()
        return

    try:
        job.status = "processing"
        db.commit()

        file_path = Path(file_path_str)
        dem_raw, input_crs, resolution_m = read_dem_raster(file_path)

        # Auto-select projected UTM metric CRS based on centroid (default lat/lon 28.0, 77.0 if local)
        utm_epsg, utm_crs_name = determine_utm_crs(77.0, 28.0)

        # 1. Hydrological Conditioning: Pit filling
        dem_filled = fill_pits(dem_raw, epsilon=settings.hydrology.pit_fill_epsilon_m)

        # 2. Metric Slope & Aspect
        slope_deg, aspect_deg = compute_slope_and_aspect(dem_filled, resolution_m, resolution_m)

        # 3. Curvature (concavity/convexity)
        curvature = compute_curvature(dem_filled, resolution_m)

        # 4. D8 Flow Accumulation
        flow_accum = compute_flow_accumulation(dem_filled)

        # 5. Topographic Wetness Index (TWI)
        twi = compute_topographic_wetness_index(dem_filled, slope_deg, flow_accum, resolution_m)

        # 6. Relative Elevation (lowland depression)
        rel_elev = compute_relative_elevation(dem_filled)

        # 7. Explainable Flood Susceptibility Screening
        susceptibility, breakdown = compute_explainable_susceptibility(
            relative_elevation=rel_elev,
            slope_deg=slope_deg,
            curvature=curvature,
            twi=twi,
            weights=settings.susceptibility_weights,
            thresholds=settings.susceptibility_thresholds,
            flat_cutoff=settings.hydrology.slope_flatness_cutoff_deg,
            steep_cutoff=settings.hydrology.slope_steep_cutoff_deg,
        )

        # 8. Save Susceptibility layer as Cloud-Optimized GeoTIFF (COG)
        cog_key = f"cogs/{job_id}_susceptibility.tif"
        cog_local_path = storage.get_path(cog_key)
        save_as_cog(
            output_path=cog_local_path,
            data_array=susceptibility,
            crs_epsg=utm_epsg,
            metadata={
                "TITLE": "Terrain-Based Flood Susceptibility Screening",
                "SCIENTIFIC_GUARDRAIL": (
                    "DEM-only output shows terrain predisposition. "
                    "It does NOT give probability, timing, depth, or real event extent."
                ),
            },
        )

        # 9. Build Reproducible Provenance Record
        provenance = build_provenance_record(
            input_file_path=file_path,
            original_filename=original_filename,
            input_crs=input_crs,
            target_crs=utm_crs_name,
            resolution_m=resolution_m,
            dem_array=dem_filled,
            parameters={
                "weights": settings.susceptibility_weights.model_dump(),
                "thresholds": settings.susceptibility_thresholds.model_dump(),
                "hydrology": settings.hydrology.model_dump(),
            },
        )

        # 10. Update JobRecord in database
        job.status = "completed"
        job.cog_path = str(cog_local_path)
        job.provenance_json = provenance.model_dump_json()
        job.explainable_breakdown_json = breakdown.model_dump_json()
        job.completed_at = datetime.now(timezone.utc)
        db.commit()

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
    finally:
        db.close()
