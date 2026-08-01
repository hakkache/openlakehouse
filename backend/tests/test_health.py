from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root() -> None:
    response = client.get("/api/v1")
    assert response.status_code == 200
    assert response.json()["name"] == "OpenLakehouse Control Plane"


def test_ready() -> None:
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}
