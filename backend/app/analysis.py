"""Pure, deterministic analysis. No HTTP or database dependencies."""
from __future__ import annotations

import math
import re
from datetime import timedelta
from typing import Any

import numpy as np
import pandas as pd

from .config import (
    BASELINE_END, BASELINE_START, MIN_MONTH_COVERAGE, MIN_RUN,
    MIN_YEAR_COVERAGE, PERCENTILE,
)
from .errors import AppError


def normalise_daily(
    dates: list[str], values: list[Any], start: str, end: str, variable: str = "temperature_2m_max"
) -> tuple[pd.Series, dict]:
    """Reindex daily; conflicting duplicates and invalid values become missing.

    Configurable engineering sanity checks:
    - Temperature: -100..65 C
    - Precipitation: 0..2000 mm
    """
    if len(dates) != len(values):
        raise AppError("Weather dates and values have different lengths.", 502)
    expected = pd.date_range(start, end, freq="D")
    entries: dict[pd.Timestamp, list[float]] = {}
    invalid_values = 0
    outside_range = 0

    is_precip = "precip" in variable.lower()
    min_bound, max_bound = (0.0, 2000.0) if is_precip else (-100.0, 65.0)

    for day, raw in zip(dates, values):
        if not isinstance(day, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
            raise AppError("Weather provider returned an invalid date format.", 502)
        try:
            stamp = pd.Timestamp(day)
        except ValueError as exc:
            raise AppError("Weather provider returned an invalid date.", 502) from exc
        if stamp < expected[0] or stamp > expected[-1]:
            outside_range += 1
            continue
        value = float("nan")
        if raw is not None:
            try:
                candidate = float(raw)
                if isinstance(raw, bool) or not math.isfinite(candidate) or not (min_bound <= candidate <= max_bound):
                    raise ValueError("Invalid weather measurement")
                value = candidate
            except (TypeError, ValueError, OverflowError):
                invalid_values += 1
        entries.setdefault(stamp, []).append(value)

    result = pd.Series(np.nan, index=expected, dtype=float, name="value")
    duplicate_dates = conflicting_duplicates = 0
    for stamp, samples in entries.items():
        if len(samples) > 1:
            duplicate_dates += 1
        finite = {v for v in samples if math.isfinite(v)}
        if len(finite) > 1:
            conflicting_duplicates += 1
        elif finite:
            result.loc[stamp] = next(iter(finite))
    return result, {
        "invalid_values": invalid_values,
        "duplicate_dates": duplicate_dates,
        "conflicting_duplicates": conflicting_duplicates,
        "outside_range_records": outside_range,
        "missing_days": int(result.isna().sum()),
    }


def detect_heatwaves(temperatures: pd.Series, threshold: float, min_days: int = MIN_RUN) -> pd.DataFrame:
    """Count consecutive calendar-day runs, not overlapping sliding windows.

    The caller supplies a complete daily index. Missing measurements break a run.
    A value equal to the threshold is not above it.
    """
    if not math.isfinite(threshold) or min_days < 1:
        raise ValueError("A finite threshold and positive run length are required.")
    if not isinstance(temperatures.index, pd.DatetimeIndex) or temperatures.empty:
        raise ValueError("A nonempty daily DatetimeIndex is required.")
    expected = pd.date_range(temperatures.index.min(), temperatures.index.max(), freq="D")
    if not temperatures.index.equals(expected):
        raise ValueError("Reindex to consecutive calendar days before detection.")
    hot = temperatures.notna() & temperatures.gt(threshold)
    run_id = hot.ne(hot.shift(fill_value=False)).cumsum()
    run_length = hot.groupby(run_id).transform("sum")
    return pd.DataFrame({
        "tmax_c": temperatures,
        "run_id": run_id,
        "heatwave": hot & run_length.ge(min_days),
    })


def baseline_threshold(series: pd.Series) -> tuple[float, dict]:
    """Compute the 95th percentile threshold over the fixed 1961-1990 baseline."""
    index = pd.date_range(f"{BASELINE_START}-01-01", f"{BASELINE_END}-12-31")
    baseline = series.reindex(index)
    overall = float(baseline.notna().mean())
    monthly = baseline.notna().groupby(baseline.index.to_period("M")).mean()
    if overall < MIN_YEAR_COVERAGE or bool((monthly < MIN_MONTH_COVERAGE).any()):
        raise AppError("Insufficient baseline coverage: need 95% overall and 90% in every baseline month.")
    threshold = float(np.quantile(baseline.dropna().to_numpy(), PERCENTILE, method="linear"))
    return threshold, {
        "start_year": BASELINE_START, "end_year": BASELINE_END,
        "coverage": overall, "valid_days": int(baseline.notna().sum()),
        "percentile": PERCENTILE, "quantile_method": "linear",
    }


def finite_or_none(value: Any) -> float | None:
    return float(value) if pd.notna(value) and math.isfinite(float(value)) else None


def linear_trend(annual: list[dict], metric: str) -> dict:
    """Ordinary Least Squares trend per decade."""
    valid = [row for row in annual if row.get(metric) is not None]
    if len(valid) < 10:
        return {
            "slope_per_decade": None, "r_squared": None, "n_years": len(valid),
            "reason": "At least 10 usable annual observations are required by this implementation."
        }
    x = np.array([row["year"] for row in valid], dtype=float)
    y = np.array([row[metric] for row in valid], dtype=float)
    centered = x - x.mean()
    slope, intercept = np.polyfit(centered, y, 1)
    if abs(slope) < 1e-12:
        slope = 0.0
    fitted = intercept + slope * centered
    total = float(np.square(y - y.mean()).sum())
    r_squared = 1 - float(np.square(y - fitted).sum()) / total if total > 0 else None
    return {
        "slope_per_decade": float(slope * 10),
        "r_squared": r_squared,
        "n_years": len(valid),
        "reason": None
    }


def mann_kendall_test(annual: list[dict], metric: str) -> dict:
    """Non-parametric Mann-Kendall test for monotonic trends.

    Bonus challenge implementation for robust climate trend detection.
    Accounts for ties and computes exact S, Var(S), Z score, p-value, and Kendall's Tau.
    """
    valid = [row for row in annual if row.get(metric) is not None]
    n = len(valid)
    if n < 10:
        return {
            "tau": None, "p_value": None, "z_score": None, "s_statistic": None,
            "trend": "insufficient_data", "significant": False, "n_years": n,
            "interpretation": "At least 10 usable annual data points are required for the Mann-Kendall test."
        }

    y = np.array([float(row[metric]) for row in valid], dtype=float)

    # Compute S statistic
    s = 0
    for k in range(n - 1):
        diff = y[k + 1:] - y[k]
        s += int(np.sign(diff).sum())

    # Count ties for variance correction
    _, tie_counts = np.unique(y, return_counts=True)
    tie_term = sum(t * (t - 1) * (2 * t + 5) for t in tie_counts if t > 1)
    var_s = (n * (n - 1) * (2 * n + 5) - tie_term) / 18.0

    # Calculate Z statistic with continuity correction
    if var_s <= 0:
        z = 0.0
    elif s > 0:
        z = (s - 1) / math.sqrt(var_s)
    elif s < 0:
        z = (s + 1) / math.sqrt(var_s)
    else:
        z = 0.0

    # Two-sided p-value using complementary error function
    p_value = math.erfc(abs(z) / math.sqrt(2.0))

    # Kendall's Tau
    total_pairs = n * (n - 1) / 2.0
    tau = s / total_pairs if total_pairs > 0 else 0.0

    # Interpretation (alpha = 0.05)
    is_significant = bool(p_value < 0.05)
    if is_significant:
        trend_direction = "increasing" if s > 0 else "decreasing"
        interp = f"Statistically significant {trend_direction} trend (p = {p_value:.4f}, τ = {tau:.3f})."
    else:
        trend_direction = "no_trend"
        interp = f"No statistically significant trend detected at 95% confidence (p = {p_value:.4f}, τ = {tau:.3f})."

    return {
        "tau": float(round(tau, 4)),
        "p_value": float(round(p_value, 5)),
        "z_score": float(round(z, 4)),
        "s_statistic": int(s),
        "trend": trend_direction,
        "significant": is_significant,
        "n_years": n,
        "interpretation": interp,
    }


def compare_periods(annual: list[dict], metric: str = "heatwave_days") -> dict:
    """Compare first 5 vs last 5 usable years of the selected range."""
    if len(annual) < 10:
        return {"available": False, "reason": "Select at least 10 years for two non-overlapping five-year periods."}
    first, last = annual[:5], annual[-5:]
    if any(row.get(metric) is None for row in first + last):
        return {"available": False, "reason": "The first or last five-year period contains an excluded year."}
    before = float(np.mean([row[metric] for row in first]))
    after = float(np.mean([row[metric] for row in last]))
    abs_change = after - before
    pct_change = ((abs_change) / before * 100) if before > 0 else None
    return {
        "available": True, "metric": f"{metric}_per_year",
        "first_period": [first[0]["year"], first[-1]["year"]],
        "last_period": [last[0]["year"], last[-1]["year"]],
        "first_mean": round(before, 2), "last_mean": round(after, 2),
        "absolute_change": round(abs_change, 2),
        "percent_change": round(pct_change, 1) if pct_change is not None else None,
        "percent_note": "Percentage change is undefined because the first-period baseline mean is zero." if before == 0 else None,
    }


def analyse(
    series: pd.Series,
    start_year: int,
    end_year: int,
    hazard: str = "heatwave"
) -> dict:
    """Run full hazard detection, quality control, annual metrics, linear trend, and Mann-Kendall test."""
    threshold, baseline = baseline_threshold(series)
    start = pd.Timestamp(f"{start_year}-01-01")
    end = pd.Timestamp(f"{end_year}-12-31")

    padded = pd.date_range(start - timedelta(days=MIN_RUN - 1), end + timedelta(days=MIN_RUN - 1))
    frame = detect_heatwaves(series.reindex(padded), threshold)

    all_events: list[dict] = []
    for _, group in frame.loc[frame.heatwave].groupby("run_id", sort=False):
        first, last = group.index[0], group.index[-1]
        before, after = first - timedelta(days=1), last + timedelta(days=1)
        left_unknown = before not in frame.index or pd.isna(frame.loc[before, "tmax_c"])
        right_unknown = after not in frame.index or pd.isna(frame.loc[after, "tmax_c"])
        if last < start or first > end:
            continue
        visible_start, visible_end = max(first, start), min(last, end)
        visible = group.loc[visible_start:visible_end]
        all_events.append({
            "observed_start": first.date().isoformat(), "observed_end": last.date().isoformat(),
            "start_in_range": visible_start.date().isoformat(), "end_in_range": visible_end.date().isoformat(),
            "days_in_range": len(visible), "observed_duration_days": len(group),
            "duration_censored": bool(left_unknown or right_unknown),
            "clipped_to_selection": bool(first < start or last > end),
            "start_year": int(first.year),
            "peak_tmax_c": float(visible.tmax_c.max()),
            "peak_excess_c": float(visible.tmax_c.max() - threshold),
        })

    annual = []
    for year in range(start_year, end_year + 1):
        part = frame.loc[f"{year}-01-01":f"{year}-12-31"]
        coverage = float(part.tmax_c.notna().mean())
        monthly = part.tmax_c.notna().groupby(part.index.month).mean()
        usable = coverage >= MIN_YEAR_COVERAGE and bool((monthly >= MIN_MONTH_COVERAGE).all())
        hw = part.loc[part.heatwave]
        starts = sum(event["start_year"] == year for event in all_events)
        longest = int(hw.groupby("run_id").size().max()) if not hw.empty else 0
        peak_excess = float(hw.tmax_c.max() - threshold) if not hw.empty else None
        annual.append({
            "year": year, "expected_days": len(part), "valid_days": int(part.tmax_c.notna().sum()),
            "coverage": coverage, "usable": usable,
            "observed_event_starts": starts, "observed_heatwave_days": len(hw),
            "event_starts": starts if usable else None,
            "heatwave_days": len(hw) if usable else None,
            "longest_segment_days": longest if usable else None,
            "peak_excess_c": peak_excess if usable else None,
        })

    for metric in ("heatwave_days", "event_starts", "longest_segment_days"):
        rolling = pd.Series([row[metric] for row in annual], dtype=float).rolling(5, min_periods=5).mean()
        for row, value in zip(annual, rolling):
            row[f"{metric}_rolling_5y"] = finite_or_none(value)

    excluded = [row["year"] for row in annual if not row["usable"]]
    report_days = frame.loc[start:end]
    missing = int(report_days.tmax_c.isna().sum())

    # Calculate trends: Linear Regression + Mann-Kendall Test
    linear_trends = {
        metric: linear_trend(annual, metric)
        for metric in ("heatwave_days", "event_starts", "longest_segment_days")
    }
    mk_trends = {
        metric: mann_kendall_test(annual, metric)
        for metric in ("heatwave_days", "event_starts", "longest_segment_days")
    }

    warnings = [
        "Percentile-based indicator using 95th percentile of 1961–1990 baseline daily maximum temperatures.",
        "One representative coordinate point represents the region; results are not area-wide interpolations.",
        "A fixed all-season threshold is used as specified in the case study brief.",
        "Both Linear Regression (slope/decade) and non-parametric Mann-Kendall tests are reported.",
    ]
    if missing:
        warnings.append(f"{missing} selected days are missing in the reanalysis record. Gaps break runs.")
    if baseline["coverage"] < 1:
        warnings.append(f"Baseline (1961–1990) completeness is {baseline['coverage']*100:.1f}%; valid days were used.")
    if excluded:
        warnings.append(f"Years with <95% daily coverage ({', '.join(map(str, excluded))}) are excluded from trends.")
    if any(event["duration_censored"] or event["clipped_to_selection"] for event in all_events):
        warnings.append("Some event durations are censored at selection boundaries.")

    return {
        "hazard": hazard,
        "threshold_c": round(threshold, 2),
        "baseline": baseline,
        "definition": {
            "operator": ">",
            "min_consecutive_days": MIN_RUN,
            "threshold_type": "fixed_baseline_all_season_percentile",
            "frequency": "observed event starts per calendar year",
            "duration": "longest within-calendar-year heatwave segment"
        },
        "annual": annual,
        "events": all_events,
        "trends": linear_trends,
        "mann_kendall": mk_trends,
        "comparison": compare_periods(annual, "heatwave_days"),
        "quality": {
            "missing_days": missing,
            "excluded_years": excluded,
            "annual_min_coverage": MIN_YEAR_COVERAGE,
            "monthly_min_coverage": MIN_MONTH_COVERAGE
        },
        "warnings": warnings,
    }
