"""Only a fixed, trusted upstream host (Open-Meteo) is reachable from user requests."""
from __future__ import annotations

import time
import httpx

from .analysis import normalise_daily
from .config import MODEL, UNITS
from .errors import AppError

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


class WeatherProvider:
    def __init__(self, client: httpx.Client | None = None):
        self.client = client or httpx.Client(
            timeout=httpx.Timeout(connect=5, read=25, write=5, pool=5),
            limits=httpx.Limits(max_connections=6, max_keepalive_connections=6),
            follow_redirects=False,
            headers={"User-Agent": "ClimateHazardStudy/2.0"},
        )

    def close(self) -> None:
        self.client.close()

    def fetch(self, region: dict, start: str, end: str, hazard: str = "heatwave") -> dict:
        tz = region.get("timezone") or "auto"
        daily_param = "temperature_2m_max" if hazard == "heatwave" else "precipitation_sum"
        params = {
            "latitude": round(float(region["latitude"]), 4),
            "longitude": round(float(region["longitude"]), 4),
            "start_date": start,
            "end_date": end,
            "daily": daily_param,
            "temperature_unit": UNITS,
            "timezone": tz,
            "models": MODEL,
        }
        for attempt in range(2):
            try:
                response = self.client.get(ARCHIVE_URL, params=params)
            except httpx.RequestError as exc:
                if attempt == 0:
                    time.sleep(0.5)
                    continue
                raise AppError("Weather service could not be reached. Please retry later.", 503, 30) from exc

            if response.status_code == 429:
                raise AppError("Weather provider is rate-limited. Please retry later.", 503, 60)

            if response.status_code >= 500 and attempt == 0:
                time.sleep(0.5)
                continue

            if not response.is_success:
                raise AppError(f"Weather provider rejected the request (status {response.status_code}).", 502)

            if len(response.content) > 5_000_000:
                raise AppError("Weather provider returned an unexpectedly large response.", 502)

            try:
                payload = response.json()
                daily_units = payload.get("daily_units", {})
                expected_unit = "°C" if hazard == "heatwave" else "mm"
                if daily_units.get(daily_param) != expected_unit:
                    raise ValueError(f"Unexpected units: {daily_units.get(daily_param)}")

                daily = payload["daily"]
                raw_values = daily[daily_param]
                series, quality = normalise_daily(daily["time"], raw_values, start, end, variable=daily_param)
                metadata = {
                    key: payload.get(key)
                    for key in ("latitude", "longitude", "elevation", "timezone", "utc_offset_seconds")
                }
            except (KeyError, TypeError, ValueError) as exc:
                raise AppError("Weather provider returned an invalid payload or unexpected format.", 502) from exc

            return {
                "dates": series.index.strftime("%Y-%m-%d").tolist(),
                "values": [float(val) if val == val else None for val in series],
                "tmax_c": [float(val) if val == val else None for val in series],
                "quality": quality,
                "grid_metadata": metadata
            }

        raise AppError("Weather service is temporarily unavailable.", 503)
