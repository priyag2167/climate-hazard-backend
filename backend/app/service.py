"""Cache-aside orchestration, bounded ingestion, and versioned keys."""
from __future__ import annotations

import hashlib
import json
import threading
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any, Protocol

import pandas as pd

from .analysis import analyse
from .config import (
    ANALYSIS_VERSION, BASELINE_END, BASELINE_START, MODEL, UNITS,
    latest_available_day
)
from .errors import AppError


class Store(Protocol):
    def get(self, collection: str, key: str) -> dict | None: ...
    def put(self, collection: str, key: str, payload: dict, days: int) -> None: ...
    def take_limit(self, scope: str, identity: str, limit: int, seconds: int) -> None: ...
    def ping(self) -> bool: ...


def cache_key(region: dict, kind: str, start: str, end: str, hazard: str = "heatwave") -> str:
    # Stable coordinates rounded to 4 decimals for high cache hit rate
    spec = {
        "kind": kind,
        "hazard": hazard,
        "lat": round(float(region["latitude"]), 4),
        "lon": round(float(region["longitude"]), 4),
        "model": MODEL,
        "units": UNITS,
        "start": start,
        "end": end,
        "version": ANALYSIS_VERSION,
        "baseline": [BASELINE_START, BASELINE_END]
    }
    return hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()


def required_blocks(start_year: int, end_year: int) -> list[tuple[str, str]]:
    ranges = [
        (date(BASELINE_START, 1, 1), date(BASELINE_END, 12, 31)),
        (date(start_year, 1, 1) - timedelta(days=2), date(end_year, 12, 31) + timedelta(days=2)),
    ]
    first_years = set()
    for first, last in ranges:
        first_years.update(range((first.year // 5) * 5, (last.year // 5) * 5 + 1, 5))
    available = latest_available_day()
    return [
        (date(year, 1, 1).isoformat(), min(date(year + 4, 12, 31), available).isoformat())
        for year in sorted(first_years)
    ]


class AnalysisService:
    def __init__(self, store: Store, provider):
        self.store = store
        self.provider = provider
        self.region_locks: dict[str, threading.Lock] = {}
        self._locks_mutex = threading.Lock()
        self.ingestion_slots = threading.BoundedSemaphore(2)

    def _get_region_lock(self, lock_key: str) -> threading.Lock:
        with self._locks_mutex:
            if lock_key not in self.region_locks:
                self.region_locks[lock_key] = threading.Lock()
            return self.region_locks[lock_key]

    def get_analysis(self, region: dict[str, Any], start_year: int, end_year: int, hazard: str = "heatwave") -> dict:
        key = cache_key(region, "analysis", str(start_year), str(end_year), hazard=hazard)
        cached = self.store.get("analyses", key)
        if cached is not None:
            return {**cached, "cache": {"analysis_hit": True}}

        lock_id = f"{region['id']}_{round(float(region['latitude']), 3)}_{round(float(region['longitude']), 3)}"
        lock = self._get_region_lock(lock_id)
        if not lock.acquire(timeout=0.1):
            raise AppError("Data for this region is currently being prepared. Please retry shortly.", 503, 10)

        slot_acquired = False
        try:
            # Check cache again once inside the lock
            cached = self.store.get("analyses", key)
            if cached is not None:
                return {**cached, "cache": {"analysis_hit": True}}

            slot_acquired = self.ingestion_slots.acquire(blocking=False)
            if not slot_acquired:
                raise AppError("Two background analyses are already running. Please retry shortly.", 503, 10)

            # Global rate limits for cold fetches
            self.store.take_limit("cold-hour", "global", 30, 3600)
            self.store.take_limit("cold-day", "global", 80, 86400)

            deadline = time.monotonic() + 90
            blocks = []
            provenance = []
            quality_totals: dict[str, int] = {}

            for first, last in required_blocks(start_year, end_year):
                if time.monotonic() > deadline:
                    raise AppError("Initial loading took too long. Cached chunks were kept; retry to finish.", 503, 10)

                chunk_key = cache_key(region, "weather", first, last, hazard=hazard)
                chunk = self.store.get("weather_chunks", chunk_key)
                if chunk is None:
                    chunk = self.provider.fetch(region, first, last, hazard=hazard)
                    self.store.put("weather_chunks", chunk_key, chunk, days=90)
                    chunk = self.store.get("weather_chunks", chunk_key)
                    if chunk is None:
                        raise AppError("Weather data could not be saved to storage.", 503)

                series_values = chunk.get("tmax_c") or chunk.get("values")
                blocks.append(pd.Series(series_values, index=pd.to_datetime(chunk["dates"]), dtype=float))
                provenance.append({"start": first, "end": last, "grid_metadata": chunk.get("grid_metadata")})
                for name, count in chunk.get("quality", {}).items():
                    quality_totals[name] = quality_totals.get(name, 0) + count

            temperatures = pd.concat(blocks).sort_index()
            # Remove any duplicate timestamps that might appear at chunk boundaries
            temperatures = temperatures[~temperatures.index.duplicated(keep="first")]

            result = analyse(temperatures, start_year, end_year, hazard=hazard)
            result.update({
                "region": region,
                "selection": {"start_year": start_year, "end_year": end_year, "hazard": hazard},
                "source": {
                    "provider": "Open-Meteo",
                    "model": MODEL,
                    "data_type": "reanalysis (ERA5)",
                    "units": "°C" if hazard == "heatwave" else "mm",
                    "timezone": region.get("timezone", "auto"),
                    "chunks": provenance
                },
                "analysis_version": ANALYSIS_VERSION,
                "computed_at": datetime.now(timezone.utc).isoformat(),
            })
            result["quality"]["ingestion_anomalies"] = quality_totals

            self.store.put("analyses", key, result, days=7)
            return {**result, "cache": {"analysis_hit": False}}
        finally:
            if slot_acquired:
                self.ingestion_slots.release()
            lock.release()
