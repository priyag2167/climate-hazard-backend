"""Explicit, versioned analysis assumptions and region configurations."""
from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Any

# Auto-load .env if present in backend or root directory
for env_path in (
    os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
):
    if os.path.isfile(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())

MODEL = "era5"
BASELINE_START = 1961
BASELINE_END = 1990
PERCENTILE = 0.95
MIN_RUN = 3
MIN_YEAR_COVERAGE = 0.95
MIN_MONTH_COVERAGE = 0.90
ANALYSIS_VERSION = "climate-hazard-2.1-mk"
UNITS = "celsius"

# Pre-configured representative points across Indian and Global regions/states
REGIONS: dict[str, dict[str, Any]] = {
    # Indian Metros & Cities
    "delhi": {"id": "delhi", "name": "Delhi (National Capital)", "category": "City", "latitude": 28.6139, "longitude": 77.2090, "timezone": "Asia/Kolkata"},
    "mumbai": {"id": "mumbai", "name": "Mumbai (Maharashtra)", "category": "City", "latitude": 19.0760, "longitude": 72.8777, "timezone": "Asia/Kolkata"},
    "bengaluru": {"id": "bengaluru", "name": "Bengaluru (Karnataka)", "category": "City", "latitude": 12.9716, "longitude": 77.5946, "timezone": "Asia/Kolkata"},
    "chennai": {"id": "chennai", "name": "Chennai (Tamil Nadu)", "category": "City", "latitude": 13.0827, "longitude": 80.2707, "timezone": "Asia/Kolkata"},
    "jaipur": {"id": "jaipur", "name": "Jaipur (Rajasthan)", "category": "City", "latitude": 26.9124, "longitude": 75.7873, "timezone": "Asia/Kolkata"},
    "kolkata": {"id": "kolkata", "name": "Kolkata (West Bengal)", "category": "City", "latitude": 22.5726, "longitude": 88.3639, "timezone": "Asia/Kolkata"},
    "hyderabad": {"id": "hyderabad", "name": "Hyderabad (Telangana)", "category": "City", "latitude": 17.3850, "longitude": 78.4867, "timezone": "Asia/Kolkata"},
    "ahmedabad": {"id": "ahmedabad", "name": "Ahmedabad (Gujarat)", "category": "City", "latitude": 23.0225, "longitude": 72.5714, "timezone": "Asia/Kolkata"},
    "lucknow": {"id": "lucknow", "name": "Lucknow (Uttar Pradesh)", "category": "City", "latitude": 26.8467, "longitude": 80.9462, "timezone": "Asia/Kolkata"},
    "pune": {"id": "pune", "name": "Pune (Maharashtra)", "category": "City", "latitude": 18.5204, "longitude": 73.8567, "timezone": "Asia/Kolkata"},
    # State centroid points
    "state_rajasthan": {"id": "state_rajasthan", "name": "Rajasthan (State Centroid)", "category": "State", "latitude": 27.0238, "longitude": 74.2179, "timezone": "Asia/Kolkata"},
    "state_maharashtra": {"id": "state_maharashtra", "name": "Maharashtra (State Centroid)", "category": "State", "latitude": 19.7515, "longitude": 75.7139, "timezone": "Asia/Kolkata"},
    "state_gujarat": {"id": "state_gujarat", "name": "Gujarat (State Centroid)", "category": "State", "latitude": 22.2587, "longitude": 71.1924, "timezone": "Asia/Kolkata"},
    "state_karnataka": {"id": "state_karnataka", "name": "Karnataka (State Centroid)", "category": "State", "latitude": 15.3173, "longitude": 75.7139, "timezone": "Asia/Kolkata"},
    "state_punjab": {"id": "state_punjab", "name": "Punjab (State Centroid)", "category": "State", "latitude": 31.1471, "longitude": 75.3412, "timezone": "Asia/Kolkata"},
    # International reference regions
    "new_york": {"id": "new_york", "name": "New York (USA)", "category": "International", "latitude": 40.7128, "longitude": -74.0060, "timezone": "America/New_York"},
    "london": {"id": "london", "name": "London (UK)", "category": "International", "latitude": 51.5074, "longitude": -0.1278, "timezone": "Europe/London"},
    "tokyo": {"id": "tokyo", "name": "Tokyo (Japan)", "category": "International", "latitude": 35.6762, "longitude": 139.6503, "timezone": "Asia/Tokyo"},
    "sydney": {"id": "sydney", "name": "Sydney (Australia)", "category": "International", "latitude": -33.8688, "longitude": 151.2093, "timezone": "Australia/Sydney"},
    "state_california": {"id": "state_california", "name": "California (USA State)", "category": "State", "latitude": 36.7783, "longitude": -119.4179, "timezone": "America/Los_Angeles"},
}

HAZARDS = {
    "heatwave": {
        "id": "heatwave",
        "name": "Heatwave",
        "variable": "temperature_2m_max",
        "units": "°C",
        "description": "3+ consecutive days with maximum temperature above the 95th percentile (1961–1990 baseline)."
    },
    "heavy_rainfall": {
        "id": "heavy_rainfall",
        "name": "Heavy Rainfall",
        "variable": "precipitation_sum",
        "units": "mm",
        "description": "Days with daily precipitation exceeding the 95th percentile of baseline wet days (>1mm)."
    }
}


def resolve_region(
    region_id: str,
    latitude: float | None = None,
    longitude: float | None = None,
    region_name: str | None = None,
    min_lat: float | None = None,
    max_lat: float | None = None,
    min_lon: float | None = None,
    max_lon: float | None = None,
) -> dict[str, Any]:
    """Resolve region from pre-configured map or custom point/box coordinates."""
    if region_id in REGIONS:
        return dict(REGIONS[region_id])

    # Custom bounding box: compute centroid point
    if min_lat is not None and max_lat is not None and min_lon is not None and max_lon is not None:
        c_lat = round((min_lat + max_lat) / 2.0, 4)
        c_lon = round((min_lon + max_lon) / 2.0, 4)
        display_name = region_name or f"Box ({min_lat:.2f}–{max_lat:.2f}°N, {min_lon:.2f}–{max_lon:.2f}°E)"
        box_id = f"box_{min_lat:.2f}_{max_lat:.2f}_{min_lon:.2f}_{max_lon:.2f}".replace("-", "m").replace(".", "p")
        return {
            "id": box_id,
            "name": display_name,
            "category": "Bounding Box",
            "latitude": c_lat,
            "longitude": c_lon,
            "timezone": "auto",
            "bounding_box": {"min_lat": min_lat, "max_lat": max_lat, "min_lon": min_lon, "max_lon": max_lon},
        }

    # Custom latitude / longitude point
    if latitude is not None and longitude is not None:
        r_lat = round(latitude, 4)
        r_lon = round(longitude, 4)
        display_name = region_name or f"Custom Point ({r_lat:.3f}°, {r_lon:.3f}°)"
        point_id = f"point_{r_lat:.3f}_{r_lon:.3f}".replace("-", "m").replace(".", "p")
        return {
            "id": point_id,
            "name": display_name,
            "category": "Custom Point",
            "latitude": r_lat,
            "longitude": r_lon,
            "timezone": "auto",
        }

    raise ValueError(f"Unrecognized region '{region_id}' and no custom coordinates provided.")


def latest_available_day() -> date:
    # Conservative buffer for reanalysis publication delay, not a live availability check.
    return date.today() - timedelta(days=7)


def latest_complete_year() -> int:
    return latest_available_day().year - 1


def allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,https://climate-hazard-frontend.vercel.app/")
    return [item.strip() for item in raw.split(",") if item.strip()]
