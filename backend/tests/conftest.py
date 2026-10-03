"""
Pytest configuration and synthetic DEM fixtures.
Pure synthetic grids designed for deterministic unit testing.
"""

from pathlib import Path
import sys
import numpy as np
import pytest
import tifffile

# Ensure backend root is on sys.path for app imports
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture
def synthetic_valley_dem() -> np.ndarray:
    """
    10x10 synthetic DEM featuring a V-shaped incised valley along column 5.
    Elevation increases outwards to simulate valley walls.
    """
    dem = np.zeros((10, 10), dtype=np.float64)
    for r in range(10):
        for c in range(10):
            dist_to_center = abs(c - 4.5)
            dem[r, c] = 100.0 + dist_to_center * 25.0 + r * 2.0
    return dem


@pytest.fixture
def synthetic_sink_dem() -> np.ndarray:
    """
    5x5 synthetic DEM with an artificial pit/sink at cell (2, 2)
    surrounded by higher rim elevation (50m, center is 10m).
    """
    dem = np.full((5, 5), 50.0, dtype=np.float64)
    dem[2, 2] = 10.0
    return dem


@pytest.fixture
def synthetic_planar_slope_dem() -> np.ndarray:
    """
    10x10 planar slope descending uniformly from West to East (dz/dx = 2m/cell).
    """
    dem = np.zeros((10, 10), dtype=np.float64)
    for c in range(10):
        dem[:, c] = 200.0 - c * 5.0
    return dem


@pytest.fixture
def temp_geotiff_path(tmp_path: Path, synthetic_valley_dem: np.ndarray) -> Path:
    """
    Creates a temporary valid GeoTIFF file with CRS for end-to-end API upload tests.
    """
    import rasterio
    from rasterio.transform import from_origin

    file_path = tmp_path / "test_synthetic_valley.tif"
    transform = from_origin(500000.0, 3000000.0, 30.0, 30.0)
    rows, cols = synthetic_valley_dem.shape

    with rasterio.open(
        file_path,
        "w",
        driver="GTiff",
        height=rows,
        width=cols,
        count=1,
        dtype=rasterio.float32,
        crs="EPSG:32643",
        transform=transform,
        nodata=-9999.0,
    ) as dst:
        dst.write(synthetic_valley_dem.astype(np.float32), 1)

    return file_path
