import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.service import AnalysisService


class FakeStore:
    def __init__(self):
        self.data = {}

    def get(self, collection: str, key: str) -> dict | None:
        return self.data.get(f"{collection}:{key}")

    def put(self, collection: str, key: str, payload: dict, days: int) -> None:
        self.data[f"{collection}:{key}"] = payload

    def take_limit(self, scope: str, identity: str, limit: int, seconds: int) -> None:
        pass

    def ping(self) -> bool:
        return True

    def close(self) -> None:
        pass


class FakeProvider:
    def fetch(self, region: dict, start: str, end: str, hazard: str = "heatwave") -> dict:
        import pandas as pd
        dates = pd.date_range(start, end, freq="D").strftime("%Y-%m-%d").tolist()
        # Synthetic temps: baseline around 30C, recent years reaching 42C
        tmax = [30.0 + (i % 15) for i in range(len(dates))]
        return {
            "dates": dates,
            "values": tmax,
            "tmax_c": tmax,
            "quality": {"invalid_values": 0, "missing_days": 0},
            "grid_metadata": {"latitude": region["latitude"], "longitude": region["longitude"], "timezone": "Asia/Kolkata"}
        }

    def close(self) -> None:
        pass


@pytest.fixture
def client():
    store = FakeStore()
    provider = FakeProvider()
    service = AnalysisService(store, provider)
    app = create_app(injected_service=service)
    return TestClient(app, raise_server_exceptions=False)


def test_api_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_regions(client):
    response = client.get("/api/regions")
    assert response.status_code == 200
    data = response.json()
    assert "regions" in data
    assert any(r["id"] == "delhi" for r in data["regions"])
    assert any(r["category"] == "State" for r in data["regions"])
    assert "hazards" in data


def test_api_analysis_preconfigured_region(client):
    response = client.get("/api/analysis?region_id=delhi&start_year=1990&end_year=2010&hazard=heatwave")
    assert response.status_code == 200
    data = response.json()
    assert data["region"]["id"] == "delhi"
    assert "threshold_c" in data
    assert "annual" in data
    assert "mann_kendall" in data
    assert "heatwave_days" in data["mann_kendall"]
    assert "trends" in data


def test_api_analysis_custom_coordinates(client):
    response = client.get("/api/analysis?region_id=custom&latitude=25.2&longitude=75.8&region_name=CustomSpot&start_year=1990&end_year=2010")
    assert response.status_code == 200
    data = response.json()
    assert data["region"]["latitude"] == 25.2
    assert data["region"]["longitude"] == 75.8
    assert data["region"]["name"] == "CustomSpot"


def test_api_analysis_csv_export(client):
    response = client.get("/api/analysis.csv?region_id=delhi&start_year=1990&end_year=2000")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    content = response.text
    assert "region_name" in content
    assert "mann_kendall_tau" in content
    assert "Delhi" in content


def test_api_analysis_bounding_box(client):
    response = client.get(
        "/api/analysis?region_id=custom&min_lat=20.0&max_lat=25.0&min_lon=75.0&max_lon=80.0&region_name=WestCentralIndia&start_year=1990&end_year=2005"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["region"]["latitude"] == 22.5
    assert data["region"]["longitude"] == 77.5
    assert "WestCentralIndia" in data["region"]["name"]


def test_api_invalid_year_range(client):
    # End before start
    response = client.get("/api/analysis?region_id=delhi&start_year=2010&end_year=2000")
    assert response.status_code == 422

    # Spanning > 80 years
    response = client.get("/api/analysis?region_id=delhi&start_year=1950&end_year=2040")
    assert response.status_code == 422


def test_api_invalid_coordinates(client):
    # Latitude > 90
    response = client.get("/api/analysis?region_id=custom&latitude=99.0&longitude=50.0")
    assert response.status_code == 422

