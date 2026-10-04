from fastapi.testclient import TestClient
import os
from scripts.make_synthetic_dem import create_dem
import time

def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_upload_not_geotiff(client):
    response = client.post("/api/jobs", files={"dem": ("test.txt", b"not a dem", "text/plain")})
    assert response.status_code == 400
    assert "Only GeoTIFFs" in response.json()["detail"]

def test_upload_valid_dem(client):
    create_dem()
    dem_path = os.path.join(os.path.dirname(__file__), "..", "synthetic_dem.tif")
    
    with open(dem_path, "rb") as f:
        response = client.post("/api/jobs", files={"dem": ("synthetic_dem.tif", f, "image/tiff")})
        
    assert response.status_code == 200
    job_id = response.json()["job_id"]
    
    time.sleep(1) # wait for bg task
    
    response = client.get(f"/api/jobs/{job_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["running", "succeeded"]
    
    if data["status"] == "succeeded":
        assert data["input_metadata"]["crs"] == "EPSG:32644"
