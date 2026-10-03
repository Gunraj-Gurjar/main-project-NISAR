"""DEM preprocessing: reprojection, nodata handling, optional AOI clip."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.mask import mask as rio_mask
from rasterio.warp import calculate_default_transform, reproject
from app.core.crs_utils import determine_utm_crs
from app.services.terrain.grid import DemGrid


def _centroid_from_bounds(bounds: Tuple[float, float, float, float]) -> Tuple[float, float]:
    minx, miny, maxx, maxy = bounds
    return (minx + maxx) / 2.0, (miny + maxy) / 2.0


def preprocess(
    dem_path: Path,
    input_crs: str,
    bounds_wgs84_or_projected: Tuple[float, float, float, float],
    aoi_bounds: Optional[Tuple[float, float, float, float]] = None,
    target_epsg: Optional[int] = None,
) -> Tuple[DemGrid, Dict[str, Any]]:
    """
    Load DEM, mask nodata, optionally clip to AOI, reproject to auto-selected UTM.
    Returns processed grid and preprocessing metadata.
    """
    with rasterio.open(dem_path) as src:
        src_crs = src.crs.to_string() if src.crs else input_crs
        if aoi_bounds is not None:
            minx, miny, maxx, maxy = aoi_bounds
            aoi_geom = [
                {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [minx, miny],
                            [maxx, miny],
                            [maxx, maxy],
                            [minx, maxy],
                            [minx, miny],
                        ]
                    ],
                }
            ]
            dem_arr, out_transform = rio_mask(src, aoi_geom, crop=True, nodata=src.nodata)
            dem_arr = dem_arr[0].astype(np.float64)
            src_transform = out_transform
            src_bounds = rasterio.transform.array_bounds(dem_arr.shape[0], dem_arr.shape[1], out_transform)
        else:
            dem_arr = src.read(1).astype(np.float64)
            src_transform = src.transform
            src_bounds = src.bounds

        src_nodata = src.nodata
        if src_nodata is not None:
            dem_arr[dem_arr == src_nodata] = np.nan

        if not np.any(np.isfinite(dem_arr)):
            raise ValueError("DEM contains no valid elevation values after nodata masking.")

        if target_epsg is None:
            if src.crs and src.crs.is_geographic:
                cx, cy = _centroid_from_bounds(src_bounds)
                target_epsg, _ = determine_utm_crs(cx, cy)
            else:
                cx, cy = _centroid_from_bounds(src_bounds)
                epsg_code = src.crs.to_epsg() if src.crs else None
                if epsg_code and (32601 <= epsg_code <= 32660 or 32701 <= epsg_code <= 32760):
                    target_epsg = epsg_code
                else:
                    from rasterio.warp import transform as warp_transform

                    lon, lat = warp_transform(src_crs, "EPSG:4326", [cx], [cy])
                    target_epsg, _ = determine_utm_crs(lon[0], lat[0])

        dst_crs = f"EPSG:{target_epsg}"
        if src_crs == dst_crs:
            return DemGrid(dem_arr, src_transform, dst_crs, nodata=src_nodata), {
                "input_crs": src_crs,
                "target_crs": dst_crs,
                "reprojected": False,
                "aoi_clipped": aoi_bounds is not None,
            }

        dst_transform, width, height = calculate_default_transform(
            src_crs,
            dst_crs,
            dem_arr.shape[1],
            dem_arr.shape[0],
            *src_bounds,
        )
        dst = np.full((height, width), np.nan, dtype=np.float64)
        reproject(
            source=dem_arr,
            destination=dst,
            src_transform=src_transform,
            src_crs=src_crs,
            dst_transform=dst_transform,
            dst_crs=dst_crs,
            src_nodata=np.nan,
            dst_nodata=np.nan,
            resampling=Resampling.bilinear,
        )

        meta = {
            "input_crs": src_crs,
            "target_crs": dst_crs,
            "reprojected": True,
            "aoi_clipped": aoi_bounds is not None,
            "target_epsg": target_epsg,
        }
        return DemGrid(dst, dst_transform, dst_crs, nodata=src_nodata), meta


def grid_from_array(
    data: np.ndarray,
    cell_size: float,
    crs: str = "EPSG:32643",
    origin_x: float = 0.0,
    origin_y: Optional[float] = None,
) -> DemGrid:
    """Build a DemGrid from an in-memory array (used in unit tests)."""
    if origin_y is None:
        origin_y = float(data.shape[0]) * 10.0
    from rasterio.transform import from_origin

    transform = from_origin(origin_x, origin_y, cell_size, cell_size)
    return DemGrid(data.astype(np.float64), transform, crs, nodata=None)

