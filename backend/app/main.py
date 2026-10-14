from __future__ import annotations

import csv
import io
import logging
from contextlib import asynccontextmanager
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .config import (
    BASELINE_END, BASELINE_START, HAZARDS, REGIONS,
    allowed_origins, latest_complete_year, resolve_region
)
from .errors import AppError
from .service import AnalysisService

logger = logging.getLogger(__name__)


class AnalysisQuery(BaseModel):
    model_config = ConfigDict(extra="ignore")
    region_id: str = Field(default="delhi", min_length=1, max_length=100)
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    region_name: str | None = Field(default=None, max_length=100)
    min_lat: float | None = Field(default=None, ge=-90.0, le=90.0)
    max_lat: float | None = Field(default=None, ge=-90.0, le=90.0)
    min_lon: float | None = Field(default=None, ge=-180.0, le=180.0)
    max_lon: float | None = Field(default=None, ge=-180.0, le=180.0)
    start_year: int = Field(default=1990, ge=1950, le=9999)
    end_year: int = Field(default=2020, ge=1950, le=9999)
    hazard: Literal["heatwave", "heavy_rainfall"] = "heatwave"

    @model_validator(mode="after")
    def valid_selection(self):
        try:
            resolve_region(
                self.region_id,
                self.latitude,
                self.longitude,
                self.region_name,
                self.min_lat,
                self.max_lat,
                self.min_lon,
                self.max_lon,
            )
        except Exception as exc:
            raise ValueError(f"Invalid region selection: {exc}") from exc

        if self.end_year < self.start_year or (self.end_year - self.start_year + 1) > 80:
            raise ValueError("Choose an ordered range of at most 80 years.")
        if self.end_year > latest_complete_year():
            raise ValueError(f"Only completed years up to {latest_complete_year()} are supported.")
        return self


def create_app(injected_service: AnalysisService | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if injected_service is not None:
            app.state.service = injected_service
            yield
            return
        from .provider import WeatherProvider
        from .store import MongoStore
        store = MongoStore()
        provider = WeatherProvider()
        app.state.service = AnalysisService(store, provider)
        try:
            yield
        finally:
            provider.close()
            store.close()

    app = FastAPI(
        title="Climate Hazard Trend Analyzer API",
        description="Analyzes historical climate hazards, trends, and statistics using Open-Meteo ERA5 reanalysis.",
        version="2.1.0",
        lifespan=lifespan
    )

    if injected_service is not None:
        app.state.service = injected_service

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Retry-After"],
    )

    from fastapi.exceptions import RequestValidationError
    from pydantic import ValidationError

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        cleaned = [{"loc": list(e.get("loc", [])), "msg": str(e.get("msg", "")), "type": str(e.get("type", ""))} for e in exc.errors()]
        return JSONResponse({"detail": cleaned}, status_code=422)

    @app.exception_handler(ValidationError)
    async def pydantic_validation_error(_: Request, exc: ValidationError):
        cleaned = [{"loc": list(e.get("loc", [])), "msg": str(e.get("msg", "")), "type": str(e.get("type", ""))} for e in exc.errors()]
        return JSONResponse({"detail": cleaned}, status_code=422)

    @app.exception_handler(AppError)
    async def expected_error(_: Request, exc: AppError):
        headers = {"Retry-After": str(exc.retry_after)} if exc.retry_after else None
        return JSONResponse({"detail": exc.message}, status_code=exc.status_code, headers=headers)

    @app.exception_handler(Exception)
    async def unexpected_error(_: Request, exc: Exception):
        logger.error("Request failed unexpectedly (%s: %s)", type(exc).__name__, exc)
        return JSONResponse({"detail": "The climate analysis service is temporarily unavailable."}, status_code=503)

    def limited_service(request: Request) -> AnalysisService:
        service = request.app.state.service
        identity = request.client.host if request.client else "unknown"
        service.store.take_limit("analysis-ip", identity, 20, 60)
        service.store.take_limit("analysis-global", "global", 200, 60)
        return service

    @app.get("/api/health")
    def health(request: Request):
        try:
            db_ok = request.app.state.service.store.ping()
        except Exception:
            db_ok = False
        if not db_ok:
            raise AppError("Database unavailable.", 503)
        return {"status": "ok", "version": "2.1.0"}

    @app.get("/api/regions")
    def regions():
        return {
            "regions": list(REGIONS.values()),
            "hazards": list(HAZARDS.values()),
            "min_year": 1950,
            "max_year": latest_complete_year(),
            "baseline": [BASELINE_START, BASELINE_END]
        }

    @app.get("/api/analysis")
    def analysis(
        query: AnalysisQuery = Depends(),
        service: AnalysisService = Depends(limited_service)
    ):
        resolved = resolve_region(
            query.region_id,
            query.latitude,
            query.longitude,
            query.region_name,
            query.min_lat,
            query.max_lat,
            query.min_lon,
            query.max_lon
        )
        return service.get_analysis(resolved, query.start_year, query.end_year, hazard=query.hazard)

    @app.get("/api/analysis.csv")
    def export_csv(
        query: AnalysisQuery = Depends(),
        service: AnalysisService = Depends(limited_service)
    ):
        resolved = resolve_region(
            query.region_id,
            query.latitude,
            query.longitude,
            query.region_name,
            query.min_lat,
            query.max_lat,
            query.min_lon,
            query.max_lon
        )
        report = service.get_analysis(resolved, query.start_year, query.end_year, hazard=query.hazard)

        stream = io.StringIO(newline="")
        fields = [
            "region_name", "category", "latitude", "longitude", "year",
            "event_starts", "heatwave_days", "longest_segment_days", "peak_excess_c",
            "coverage", "usable", "threshold_c", "baseline_period", "source_model",
            "linear_slope_per_decade", "linear_r_squared", "mann_kendall_tau", "mann_kendall_p_value", "mann_kendall_trend"
        ]
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()

        hw_trend = report.get("trends", {}).get("heatwave_days", {})
        hw_mk = report.get("mann_kendall", {}).get("heatwave_days", {})

        for row in report.get("annual", []):
            writer.writerow({
                "region_name": report["region"]["name"],
                "category": report["region"].get("category", "Custom"),
                "latitude": report["region"]["latitude"],
                "longitude": report["region"]["longitude"],
                "year": row["year"],
                "event_starts": row.get("event_starts"),
                "heatwave_days": row.get("heatwave_days"),
                "longest_segment_days": row.get("longest_segment_days"),
                "peak_excess_c": row.get("peak_excess_c"),
                "coverage": round(row["coverage"] * 100, 2) if row.get("coverage") is not None else None,
                "usable": "Yes" if row.get("usable") else "No (Excluded)",
                "threshold_c": report.get("threshold_c"),
                "baseline_period": f"{BASELINE_START}-{BASELINE_END}",
                "source_model": "Open-Meteo ERA5 Reanalysis",
                "linear_slope_per_decade": hw_trend.get("slope_per_decade"),
                "linear_r_squared": hw_trend.get("r_squared"),
                "mann_kendall_tau": hw_mk.get("tau"),
                "mann_kendall_p_value": hw_mk.get("p_value"),
                "mann_kendall_trend": hw_mk.get("trend"),
            })

        safe_name = report["region"]["id"].replace(" ", "_")
        filename = f"climate-hazard-{safe_name}-{query.start_year}-{query.end_year}.csv"
        return Response(
            stream.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    return app


app = create_app()
