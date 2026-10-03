from pathlib import Path
from fastapi.testclient import TestClient
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin

from app.core.database import init_db
from app.main import app


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def valid_single_band_geotiff(tmp_path: Path) -> Path:
    """Create a valid single-band GeoTIFF with EPSG:32643 CRS."""
    file_path = tmp_path / "valid_dem.tif"
    data = np.array([
        [150.0, 140.0, 130.0],
        [140.0, 120.0, 110.0],
        [130.0, 110.0, 100.0],
    ], dtype=np.float32)

    transform = from_origin(500000.0, 3000000.0, 30.0, 30.0)
    with rasterio.open(
        file_path,
        "w",
        driver="GTiff",
        height=3,
        width=3,
        count=1,
        dtype=rasterio.float32,
        crs="EPSG:32643",
        transform=transform,
        nodata=-9999.0,
    ) as dst:
        dst.write(data, 1)

    return file_path


@pytest.fixture
def multiband_geotiff(tmp_path: Path) -> Path:
    """Create a multi-band GeoTIFF (e.g. 3-band RGB/satellite image) which must be rejected."""
    file_path = tmp_path / "multiband_image.tif"
    data = np.zeros((3, 5, 5), dtype=np.float32)
    transform = from_origin(500000.0, 3000000.0, 30.0, 30.0)
    with rasterio.open(
        file_path,
        "w",
        driver="GTiff",
        height=5,
        width=5,
        count=3,
        dtype=rasterio.float32,
        crs="EPSG:32643",
        transform=transform,
    ) as dst:
        dst.write(data)

    return file_path


@pytest.fixture
def missing_crs_geotiff(tmp_path: Path) -> Path:
    """Create a GeoTIFF without a defined CRS which must be rejected."""
    file_path = tmp_path / "missing_crs.tif"
    data = np.ones((5, 5), dtype=np.float32) * 50.0
    with rasterio.open(
        file_path,
        "w",
        driver="GTiff",
        height=5,
        width=5,
        count=1,
        dtype=rasterio.float32,
        crs=None,  # No CRS
    ) as dst:
        dst.write(data, 1)

    return file_path


def test_valid_dem_upload_and_metadata_extraction(client: TestClient, valid_single_band_geotiff: Path):
    """
    Verify that a valid single-band GeoTIFF with CRS is accepted,
    queued as a job, and returns complete extracted metadata.
    """
    with open(valid_single_band_geotiff, "rb") as f:
        response = client.post(
            "/api/jobs",
            files={"file": ("valid_dem.tif", f, "image/tiff")},
        )

    assert response.status_code == 200, response.text
    data = response.json()
    assert "job_id" in data
    assert data["job_id"].startswith("job_")
    assert data["status"] == "queued"

    # Verify extracted metadata
    meta = data["metadata"]
    assert "EPSG:32643" in meta["crs"]
    assert meta["band_count"] == 1
    assert meta["elevation_min"] == 100.0
    assert meta["elevation_max"] == 150.0
    assert meta["size"] == [3, 3]
    assert len(meta["bounds"]) == 4
    assert len(meta["resolution"]) == 2
    assert meta["nodata"] == -9999.0


def test_reject_multiband_upload(client: TestClient, multiband_geotiff: Path):
    """Verify that multi-band rasters are rejected with a clear message."""
    with open(multiband_geotiff, "rb") as f:
        response = client.post(
            "/api/jobs",
            files={"file": ("multiband_image.tif", f, "image/tiff")},
        )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "single-band" in detail.lower()


def test_reject_missing_crs_upload(client: TestClient, missing_crs_geotiff: Path):
    """Verify that rasters lacking a CRS are rejected with a clear message."""
    with open(missing_crs_geotiff, "rb") as f:
        response = client.post(
            "/api/jobs",
            files={"file": ("missing_crs.tif", f, "image/tiff")},
        )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "crs" in detail.lower()


def test_reject_invalid_file_extension(client: TestClient, tmp_path: Path):
    """Verify that non-TIFF files are rejected immediately."""
    fake_txt = tmp_path / "notes.txt"
    fake_txt.write_text("not a geotiff")

    with open(fake_txt, "rb") as f:
        response = client.post(
            "/api/jobs",
            files={"file": ("notes.txt", f, "text/plain")},
        )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "geotiff" in detail.lower()
