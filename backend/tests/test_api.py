from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.core.advisory_engine import MANDATORY_DISCLAIMER
from app.db.database import init_db
from app.main import app
from app.worker.background_runner import process_screening_job


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()


@pytest.fixture
def client():
    return TestClient(app)


def test_healthcheck(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_root_scientific_guardrails(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    guardrails = data["scientific_guardrails"]
    assert "flood susceptibility" in guardrails["output_terminology"]
    assert "NISAR does not provide elevation data" in guardrails["sar_validation_role"]
    assert MANDATORY_DISCLAIMER in guardrails["institutional_advisory_notice"]


def test_end_to_end_job_lifecycle(client: TestClient, temp_geotiff_path: Path):
    """
    Test uploading a DEM, processing it, retrieving status,
    running SAR validation, and retrieving the institutional advisory.
    """
    # 1. Submit screening job
    with open(temp_geotiff_path, "rb") as f:
        response = client.post(
            "/api/jobs",
            files={"file": ("test_synthetic_valley.tif", f, "image/tiff")},
        )
    assert response.status_code == 200
    job_info = response.json()
    job_id = job_info["job_id"]
    assert job_id.startswith("job_")

    # 2. Synchronously run geoprocessing worker for test
    process_screening_job(
        job_id=job_id,
        file_path_str=str(temp_geotiff_path),
        original_filename="test_synthetic_valley.tif",
    )

    # 3. Retrieve completed job details
    get_res = client.get(f"/api/jobs/{job_id}")
    assert get_res.status_code == 200
    job_detail = get_res.json()
    assert job_detail["status"] == "completed"
    assert job_detail["provenance"] is not None
    assert job_detail["provenance"]["sha256_hash"] != ""
    assert job_detail["explainable_breakdown"] is not None

    # Check factor breakdown
    breakdown = job_detail["explainable_breakdown"]
    assert len(breakdown["factor_contributions"]) == 4
    assert len(breakdown["zones"]) == 4

    # 4. Download COG
    cog_res = client.get(f"/api/jobs/{job_id}/cog")
    assert cog_res.status_code == 200
    assert len(cog_res.content) > 0

    # 5. SAR validation
    val_res = client.post(
        f"/api/jobs/{job_id}/validate",
        json={
            "observation_source": "NISAR L-band",
            "sar_acquisition_date": "2026-09-28",
            "susceptibility_threshold": 0.40,
        },
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert "intersection_over_union_csi" in val_data
    assert "precision" in val_data
    assert "recall" in val_data
    assert val_data["observation_source"] == "NISAR L-band"

    # 6. Advisory with mandatory disclaimer
    adv_res = client.get(f"/api/jobs/{job_id}/advisory")
    assert adv_res.status_code == 200
    adv_data = adv_res.json()
    assert adv_data["official_advisory_notice"] == MANDATORY_DISCLAIMER
    assert "Elevated" in adv_data["advisory_level"] or "Routine" in adv_data["advisory_level"] or "Guarded" in adv_data["advisory_level"]

    # 7. Advisory with rainfall context
    rain_adv_res = client.post(
        f"/api/jobs/{job_id}/advisory",
        json={
            "rainfall_24h_mm": 85.0,
            "rainfall_source": "IMD Regional Weather Station",
        },
    )
    assert rain_adv_res.status_code == 200
    rain_adv_data = rain_adv_res.json()
    assert rain_adv_data["official_advisory_notice"] == MANDATORY_DISCLAIMER
    assert "85.0 mm" in rain_adv_data["rainfall_context"]
