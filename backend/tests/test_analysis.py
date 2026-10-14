import math
import numpy as np
import pandas as pd
import pytest

from app.analysis import (
    analyse, baseline_threshold, compare_periods, detect_heatwaves,
    linear_trend, mann_kendall_test, normalise_daily
)
from app.config import resolve_region
from app.errors import AppError


def test_normalise_daily_handles_outliers_and_duplicates():
    dates = ["2020-01-01", "2020-01-02", "2020-01-02", "2020-01-03", "2020-01-04"]
    # 200 is outside [-100, 65], duplicate on 01-02 with conflicting values
    values = [25.0, 30.0, 35.0, 200.0, None]
    series, quality = normalise_daily(dates, values, "2020-01-01", "2020-01-04")

    assert len(series) == 4
    assert series.iloc[0] == 25.0
    # Conflicting duplicates become NaN
    assert math.isnan(series.iloc[1])
    # Out of range 200.0 becomes NaN
    assert math.isnan(series.iloc[2])
    # None becomes NaN
    assert math.isnan(series.iloc[3])
    assert quality["conflicting_duplicates"] == 1
    assert quality["invalid_values"] == 1


def test_detect_heatwaves_requires_consecutive_days():
    # Create 7 consecutive days: 2 days above, 1 day below, 3 days above (only the 3-day is a heatwave)
    dates = pd.date_range("2020-05-01", "2020-05-07")
    temps = pd.Series([42.0, 43.0, 35.0, 41.0, 42.0, 43.0, 30.0], index=dates)
    hw_df = detect_heatwaves(temps, threshold=40.0, min_days=3)

    # First two days are hot but run length is 2 (< 3)
    assert not hw_df.loc["2020-05-01", "heatwave"]
    assert not hw_df.loc["2020-05-02", "heatwave"]
    # 3rd day is below threshold
    assert not hw_df.loc["2020-05-03", "heatwave"]
    # Days 4, 5, 6 are consecutive >= 3 days above threshold
    assert hw_df.loc["2020-05-04", "heatwave"]
    assert hw_df.loc["2020-05-05", "heatwave"]
    assert hw_df.loc["2020-05-06", "heatwave"]
    # Day 7 below
    assert not hw_df.loc["2020-05-07", "heatwave"]


def test_linear_trend_calculation():
    # Perfect trend: 10 years, increasing by 2 days each year
    annual = [{"year": 2000 + i, "heatwave_days": 10 + 2 * i} for i in range(12)]
    trend = linear_trend(annual, "heatwave_days")
    assert trend["slope_per_decade"] == pytest.approx(20.0, rel=1e-3)
    assert trend["r_squared"] == pytest.approx(1.0, rel=1e-3)
    assert trend["n_years"] == 12


def test_mann_kendall_test_significant_increasing_trend():
    # Monotonically increasing sequence has strong positive S and Kendall Tau = 1.0
    annual = [{"year": 2000 + i, "heatwave_days": 5 + i * 3} for i in range(15)]
    mk = mann_kendall_test(annual, "heatwave_days")
    assert mk["trend"] == "increasing"
    assert mk["significant"] is True
    assert mk["tau"] == 1.0
    assert mk["p_value"] < 0.001
    assert "Statistically significant increasing trend" in mk["interpretation"]


def test_mann_kendall_test_no_trend():
    # Alternating values around mean: no monotonic trend
    annual = [{"year": 2000 + i, "heatwave_days": 10 if i % 2 == 0 else 11} for i in range(15)]
    mk = mann_kendall_test(annual, "heatwave_days")
    assert mk["trend"] == "no_trend"
    assert mk["significant"] is False
    assert mk["p_value"] > 0.05


def test_compare_periods():
    annual = [{"year": 1990 + i, "heatwave_days": 10} for i in range(5)] + \
             [{"year": 1995 + i, "heatwave_days": 12} for i in range(5)] + \
             [{"year": 2000 + i, "heatwave_days": 20} for i in range(5)]
    comp = compare_periods(annual, "heatwave_days")
    assert comp["available"] is True
    assert comp["first_mean"] == 10.0
    assert comp["last_mean"] == 20.0
    assert comp["absolute_change"] == 10.0
    assert comp["percent_change"] == 100.0


def test_resolve_region():
    # Standard city
    reg = resolve_region("delhi")
    assert reg["name"] == "Delhi (National Capital)"
    assert reg["latitude"] == pytest.approx(28.6139)

    # Custom point
    cust = resolve_region("custom", latitude=19.5, longitude=73.2, region_name="My Town")
    assert cust["name"] == "My Town"
    assert cust["latitude"] == 19.5
    assert cust["longitude"] == 73.2

    # Bounding box
    box = resolve_region("custom", min_lat=10.0, max_lat=20.0, min_lon=70.0, max_lon=80.0)
    assert box["latitude"] == 15.0
    assert box["longitude"] == 75.0
