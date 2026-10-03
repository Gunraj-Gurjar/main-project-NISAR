from pathlib import Path
from typing import Tuple
import numpy as np
import rasterio

from app.models.schemas import DemMetadata


class DemValidationError(ValueError):
    """Raised when an uploaded file fails DEM validation criteria."""
    pass


def validate_and_extract_dem_metadata(file_path: Path) -> Tuple[DemMetadata, np.ndarray]:
    """
    Validate that an uploaded file is a readable single-band GeoTIFF with a valid CRS.
    Rejects multi-band imagery, missing CRS, unreadable files, or non-elevation data.
    Extracts and returns (DemMetadata, dem_array).
    """
    try:
        with rasterio.open(file_path) as src:
            # 1. Validate band count: must be single-band
            if src.count != 1:
                raise DemValidationError(
                    f"Uploaded raster must be a single-band DEM; received {src.count} bands."
                )

            # 2. Validate CRS: must have a defined projection
            if not src.crs:
                raise DemValidationError(
                    "Uploaded GeoTIFF lacks a Coordinate Reference System (CRS). "
                    "A valid projected or geographic CRS is required for terrain processing."
                )

            # 3. Read elevation band
            raw_data = src.read(1).astype(np.float64)
            nodata_val = src.nodata

            # Mask nodata
            if nodata_val is not None:
                raw_data[raw_data == nodata_val] = np.nan

            valid_mask = np.isfinite(raw_data)
            if not np.any(valid_mask):
                raise DemValidationError(
                    "Uploaded GeoTIFF contains no valid numeric elevation values."
                )

            elev_min = float(np.min(raw_data[valid_mask]))
            elev_max = float(np.max(raw_data[valid_mask]))
            elev_mean = float(np.mean(raw_data[valid_mask]))

            # Guard against corrupted files or non-elevation rasters
            if elev_min < -12000.0 or elev_max > 10000.0:
                raise DemValidationError(
                    f"Elevation values out of physical bounds (min: {elev_min:.1f}m, max: {elev_max:.1f}m). "
                    "Verify file is an elevation DEM in metres."
                )

            bounds_tuple = (
                float(src.bounds.left),
                float(src.bounds.bottom),
                float(src.bounds.right),
                float(src.bounds.top),
            )
            res_tuple = (float(src.res[0]), float(src.res[1]))
            size_tuple = (int(src.height), int(src.width))

            metadata = DemMetadata(
                crs=str(src.crs),
                bounds=bounds_tuple,
                resolution=res_tuple,
                nodata=float(nodata_val) if nodata_val is not None else None,
                size=size_tuple,
                band_count=src.count,
                elevation_min=round(elev_min, 2),
                elevation_max=round(elev_max, 2),
                elevation_mean=round(elev_mean, 2),
            )

            return metadata, raw_data

    except rasterio.errors.RasterioIOError as e:
        raise DemValidationError(f"File is not a readable GeoTIFF raster: {str(e)}")
