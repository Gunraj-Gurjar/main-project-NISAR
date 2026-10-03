from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client: TestClient):
    """Verify GET /api/health returns 200 and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "version" in data
