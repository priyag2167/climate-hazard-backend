import React from "react";
import type { Report } from "../../types";
import { format } from "../../utils/formatters";

interface MetricsGridProps {
  report: Report;
}

export function MetricsGrid({ report }: MetricsGridProps): React.ReactElement {
  const hwTrend = report.trends.heatwave_days;
  const hwMk = report.mann_kendall.heatwave_days;
  const usableYears = report.annual.filter((row) => row.usable).length;

  return (
    <section className="metrics-grid" aria-label="Summary Statistics Cards">
      {/* 1. Baseline Threshold Card */}
      <article className="stat-card">
        <div className="stat-header">
          <span className="stat-title">Baseline 95th %ile Threshold</span>
          <span className="stat-pill">1961–1990</span>
        </div>
        <div className="stat-value">{format(report.threshold_c)} °C</div>
        <div className="stat-footer">
          Qualifying runs exceed this temperature for ≥ 3 consecutive calendar days.
        </div>
      </article>

      {/* 2. Linear Regression Slope Card */}
      <article className="stat-card">
        <div className="stat-header">
          <span className="stat-title">Linear Regression Slope</span>
          <span className="stat-pill">OLS Fit</span>
        </div>
        <div className="stat-value">
          {hwTrend?.slope_per_decade != null ? (
            <>
              {hwTrend.slope_per_decade > 0 ? "+" : ""}
              {format(hwTrend.slope_per_decade)}{" "}
              <span className="unit">days / decade</span>
            </>
          ) : (
            "—"
          )}
        </div>
        <div className="stat-footer">
          R² = {hwTrend?.r_squared != null ? hwTrend.r_squared.toFixed(2) : "—"} · Based on{" "}
          {hwTrend?.n_years} usable years.
        </div>
      </article>

      {/* 3. Mann-Kendall Trend Test Card */}
      <article className="stat-card highlight">
        <div className="stat-header">
          <span className="stat-title">Mann-Kendall Trend Test</span>
          <span className={`stat-pill ${hwMk?.significant ? "significant" : "neutral"}`}>
            {hwMk?.significant ? "Statistically Significant" : "Non-Significant"}
          </span>
        </div>
        <div className="stat-value">
          τ = {hwMk?.tau != null ? hwMk.tau.toFixed(3) : "—"}
          <span className="unit">
            {" "}
            (p = {hwMk?.p_value != null ? hwMk.p_value.toFixed(4) : "—"})
          </span>
        </div>
        <div className="stat-footer">
          S = {hwMk?.s_statistic ?? "—"} ·{" "}
          {hwMk?.interpretation || "Non-parametric monotonic rank test."}
        </div>
      </article>

      {/* 4. Data Completeness & Quality Card */}
      <article className="stat-card">
        <div className="stat-header">
          <span className="stat-title">Data Completeness & Quality</span>
          <span className="stat-pill">Quality Gates</span>
        </div>
        <div className="stat-value">
          {usableYears} <span className="unit">/ {report.annual.length} usable years</span>
        </div>
        <div className="stat-footer">
          {report.quality.missing_days} missing days · Gaps break runs without artificial
          interpolation.
        </div>
      </article>
    </section>
  );
}
