import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  FileText,
  AlertTriangle,
  Layers,
  Calendar,
  BarChart3,
  Globe,
  Database,
  Flame,
  CloudRain,
  CheckCircle,
} from "lucide-react";
import { apiUrl, fetchAnalysis, fetchJson, buildQueryParams } from "./api";
import { RegionMap } from "./RegionMap";
import { TrendChart, metricNames } from "./TrendChart";
import { exportReportToPDF } from "./pdfExport";
import type { Metric, Region, Report, Hazard } from "./types";

const format = (value: number | null | undefined, digits = 1) =>
  value == null ? "—" : value.toFixed(digits);

export default function App() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [regionType, setRegionType] = useState<"preset" | "custom" | "box">("preset");
  const [selectedPreset, setSelectedPreset] = useState("delhi");
  const [customLat, setCustomLat] = useState(28.6139);
  const [customLon, setCustomLon] = useState(77.2090);
  const [customName, setCustomName] = useState("Delhi");

  // Bounding box state
  const [boxMinLat, setBoxMinLat] = useState(27.5);
  const [boxMaxLat, setBoxMaxLat] = useState(29.5);
  const [boxMinLon, setBoxMinLon] = useState(76.2);
  const [boxMaxLon, setBoxMaxLon] = useState(78.2);

  const [hazard, setHazard] = useState<"heatwave" | "heavy_rainfall">("heatwave");
  const [startYear, setStartYear] = useState(1990);
  const [endYear, setEndYear] = useState(2020);
  const [maxYear, setMaxYear] = useState(new Date().getFullYear() - 1);

  const [report, setReport] = useState<Report | null>(null);
  const [metric, setMetric] = useState<Metric>("heatwave_days");
  const [busy, setBusy] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState("");

  // Fetch supported regions and metadata on load
  useEffect(() => {
    const controller = new AbortController();
    fetchJson<{ regions: Region[]; hazards: Hazard[]; max_year: number }>("/api/regions", controller.signal)
      .then((data) => {
        setRegions(data.regions);
        setHazards(data.hazards || []);
        setMaxYear(data.max_year);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(String(err.message));
      });
    return () => controller.abort();
  }, []);

  // Update map coordinates when preset changes
  function handlePresetChange(regId: string) {
    setSelectedPreset(regId);
    const found = regions.find((r) => r.id === regId);
    if (found) {
      setCustomLat(found.latitude);
      setCustomLon(found.longitude);
      setCustomName(found.name);
    }
  }

  // Handle map click or marker drag
  function handleLocationSelect(lat: number, lon: number, name?: string) {
    setCustomLat(lat);
    setCustomLon(lon);
    if (name) setCustomName(name);
    setRegionType("custom");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setReport(null);

    if (
      !Number.isInteger(startYear) ||
      !Number.isInteger(endYear) ||
      startYear < 1950 ||
      endYear > maxYear ||
      startYear > endYear ||
      endYear - startYear + 1 > 80
    ) {
      setError(`Choose whole years from 1950 to ${maxYear}, ordered, spanning at most 80 years.`);
      return;
    }

    setBusy(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 120_000);

    try {
      const params = {
        regionId: regionType === "preset" ? selectedPreset : "custom",
        startYear,
        endYear,
        hazard,
        latitude: regionType === "custom" ? customLat : undefined,
        longitude: regionType === "custom" ? customLon : undefined,
        regionName: regionType === "custom" ? customName : undefined,
        minLat: regionType === "box" ? boxMinLat : undefined,
        maxLat: regionType === "box" ? boxMaxLat : undefined,
        minLon: regionType === "box" ? boxMinLon : undefined,
        maxLon: regionType === "box" ? boxMaxLon : undefined,
      };

      const result = await fetchAnalysis(params, controller.signal);
      setReport(result);
    } catch (err) {
      setError(
        controller.signal.aborted
          ? "Analysis timed out. Retry: completed data chunks are stored in MongoDB."
          : err instanceof Error
          ? err.message
          : "Analysis request failed."
      );
    } finally {
      window.clearTimeout(timer);
      setBusy(false);
    }
  }

  async function handleExportPDF() {
    if (!report) return;
    setExportingPdf(true);
    try {
      await exportReportToPDF("climate-report-container", report);
    } catch (err) {
      alert("Failed to generate PDF. You can also print the page to PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  const comparison = report?.comparison;
  const usableYears = report?.annual.filter((row) => row.usable).length ?? 0;
  const hwTrend = report?.trends.heatwave_days;
  const hwMk = report?.mann_kendall.heatwave_days;

  const csvParams = report
    ? buildQueryParams({
        regionId: report.region.id,
        startYear: report.selection.start_year,
        endYear: report.selection.end_year,
        hazard: report.hazard,
        latitude: report.region.latitude,
        longitude: report.region.longitude,
        regionName: report.region.name,
      })
    : "";

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <Globe className="brand-icon" size={24} />
          <div>
            <div className="brand-title">Climate Hazard Analyzer</div>
            <div className="brand-subtitle">Historical Trend & Extreme Weather Detection</div>
          </div>
        </div>
        <div className="nav-badges">
          <span className="badge badge-accent">ERA5 Reanalysis</span>
          <span className="badge badge-secondary">MongoDB Cached</span>
          <span className="badge badge-outline">Case Study v2.1</span>
        </div>
      </nav>

      <main className="main-content">
        {/* Header Hero */}
        <header className="hero-section">
          <div className="eyebrow-tag">
            <Flame size={14} className="icon-pulse" />
            <span>CLIMATE RISK & EXTREME EVENT ANALYZER</span>
          </div>
          <h1>Historical Climate Hazard Trends</h1>
          <p className="hero-description">
            Evaluate long-term changes in extreme heatwave frequency, duration, and intensity with
            rigorous 95th-percentile baseline rules, linear regression, and non-parametric Mann-Kendall trend tests.
          </p>
        </header>

        {/* Configuration Controls Panel */}
        <section className="panel controls-panel" aria-label="Analysis Configuration">
          <div className="panel-header">
            <div className="panel-title">
              <Layers size={18} />
              <span>Select Hazard, Region & Time Horizon</span>
            </div>
            <div className="preset-tabs">
              <button
                type="button"
                className={`tab-btn ${regionType === "preset" ? "active" : ""}`}
                onClick={() => setRegionType("preset")}
              >
                Predefined Regions
              </button>
              <button
                type="button"
                className={`tab-btn ${regionType === "custom" ? "active" : ""}`}
                onClick={() => setRegionType("custom")}
              >
                Custom Coordinates / Map
              </button>
              <button
                type="button"
                className={`tab-btn ${regionType === "box" ? "active" : ""}`}
                onClick={() => setRegionType("box")}
              >
                Lat-Lon Bounding Box
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="controls-form">
            <div className="form-grid">
              {/* Region Selection */}
              {regionType === "preset" && (
                <div className="form-group">
                  <label htmlFor="region-select">
                    <MapPin size={15} /> Pre-configured Region / State
                  </label>
                  <select
                    id="region-select"
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    disabled={busy || !regions.length}
                  >
                    <optgroup label="Metros & Major Cities">
                      {regions
                        .filter((r) => r.category === "City")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="States">
                      {regions
                        .filter((r) => r.category === "State")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="International Hubs">
                      {regions
                        .filter((r) => r.category === "International")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {regionType === "custom" && (
                <>
                  <div className="form-group">
                    <label>
                      <MapPin size={15} /> Custom Latitude (°N)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="-90"
                      max="90"
                      value={customLat}
                      required
                      disabled={busy}
                      onChange={(e) => setCustomLat(parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <MapPin size={15} /> Custom Longitude (°E)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="-180"
                      max="180"
                      value={customLon}
                      required
                      disabled={busy}
                      onChange={(e) => setCustomLon(parseFloat(e.target.value))}
                    />
                  </div>
                </>
              )}

              {regionType === "box" && (
                <>
                  <div className="form-group">
                    <label>Min Lat / Max Lat (°N)</label>
                    <div className="input-pair">
                      <input
                        type="number"
                        step="0.1"
                        value={boxMinLat}
                        onChange={(e) => setBoxMinLat(parseFloat(e.target.value))}
                        disabled={busy}
                        placeholder="Min Lat"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={boxMaxLat}
                        onChange={(e) => setBoxMaxLat(parseFloat(e.target.value))}
                        disabled={busy}
                        placeholder="Max Lat"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Min Lon / Max Lon (°E)</label>
                    <div className="input-pair">
                      <input
                        type="number"
                        step="0.1"
                        value={boxMinLon}
                        onChange={(e) => setBoxMinLon(parseFloat(e.target.value))}
                        disabled={busy}
                        placeholder="Min Lon"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={boxMaxLon}
                        onChange={(e) => setBoxMaxLon(parseFloat(e.target.value))}
                        disabled={busy}
                        placeholder="Max Lon"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Hazard Selection */}
              <div className="form-group">
                <label htmlFor="hazard-select">
                  <Flame size={15} /> Hazard Type
                </label>
                <select
                  id="hazard-select"
                  value={hazard}
                  onChange={(e) => setHazard(e.target.value as any)}
                  disabled={busy}
                >
                  <option value="heatwave">Heatwave (Default · 95th %ile Tmax)</option>
                  <option value="heavy_rainfall">Heavy Rainfall (Extreme Precipitation)</option>
                </select>
              </div>

              {/* Time Horizon Selection */}
              <div className="form-group">
                <label>
                  <Calendar size={15} /> Time Range
                </label>
                <div className="input-pair">
                  <input
                    type="number"
                    min="1950"
                    max={maxYear}
                    value={startYear}
                    required
                    disabled={busy}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    title="Start Year"
                  />
                  <span className="pair-separator">to</span>
                  <input
                    type="number"
                    min="1950"
                    max={maxYear}
                    value={endYear}
                    required
                    disabled={busy}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                    title="End Year"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets & Submit */}
            <div className="controls-footer">
              <div className="quick-presets">
                <span className="preset-label">Quick Presets:</span>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => {
                    setStartYear(1990);
                    setEndYear(2020);
                  }}
                >
                  1990–2020 (Brief Default)
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => {
                    setStartYear(1980);
                    setEndYear(2023);
                  }}
                >
                  1980–2023 (44 yrs)
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => {
                    setStartYear(2000);
                    setEndYear(2024);
                  }}
                >
                  2000–2024 (Recent)
                </button>
              </div>

              <button type="submit" className="submit-btn" disabled={busy}>
                {busy ? (
                  <>
                    <span className="spinner"></span> Analyzing Weather Data…
                  </>
                ) : (
                  <>
                    <BarChart3 size={18} /> Analyze Trends
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Interactive Leaflet Map for Visual Region Selection */}
          <RegionMap
            selectedLat={regionType === "box" ? (boxMinLat + boxMaxLat) / 2 : customLat}
            selectedLon={regionType === "box" ? (boxMinLon + boxMaxLon) / 2 : customLon}
            regionName={regionType === "box" ? "Bounding Box Area" : customName}
            regions={regions}
            boundingBox={
              regionType === "box"
                ? { min_lat: boxMinLat, max_lat: boxMaxLat, min_lon: boxMinLon, max_lon: boxMaxLon }
                : null
            }
            onLocationSelect={handleLocationSelect}
          />
        </section>

        {/* Loading / Notice State */}
        {busy && (
          <div className="notice-banner" role="status">
            <Database className="animate-spin" size={20} />
            <div>
              <strong>Ingesting & Analyzing Reanalysis Data</strong>
              <p>
                Querying Open-Meteo ERA5 5-year cached chunks and running statistical quality checks.
                Subsequent requests for overlapping periods will hit the MongoDB cache instantly.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={20} />
            <div>
              <strong>Analysis Could Not Complete</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Empty Starter Prompt */}
        {!busy && !report && !error && (
          <div className="empty-state">
            <Globe size={48} className="empty-icon" />
            <h3>Ready to Analyze Historical Hazards</h3>
            <p>
              Select a city, click anywhere on the map, or choose a custom bounding box, then press{" "}
              <strong>Analyze Trends</strong>.
            </p>
          </div>
        )}

        {/* Analysis Results Display */}
        {report && (
          <div id="climate-report-container" className="report-container">
            {/* Header & Export Toolbar */}
            <div className="results-toolbar">
              <div>
                <h2>
                  {report.region.name} · {report.selection.start_year}–{report.selection.end_year}
                </h2>
                <div className="meta-subtext">
                  <span>Coordinates: {report.region.latitude.toFixed(3)}°N, {report.region.longitude.toFixed(3)}°E</span>
                  <span>•</span>
                  <span>Timezone: {report.source.timezone}</span>
                  <span>•</span>
                  <span className={`cache-badge ${report.cache.analysis_hit ? "hit" : "miss"}`}>
                    {report.cache.analysis_hit ? "⚡ Loaded from MongoDB Cache" : "Fresh Reanalysis Computed & Stored"}
                  </span>
                </div>
              </div>

              <div className="export-actions">
                <button
                  type="button"
                  className="btn-action primary"
                  onClick={handleExportPDF}
                  disabled={exportingPdf}
                  title="Export High-Resolution PDF"
                >
                  <FileText size={16} />
                  {exportingPdf ? "Generating PDF…" : "Export PDF Report"}
                </button>
                <a
                  className="btn-action secondary"
                  href={apiUrl(`/api/analysis.csv?${csvParams}`)}
                  download
                  title="Download Annual CSV Data"
                >
                  <Download size={16} /> Export CSV
                </a>
              </div>
            </div>

            {/* KEY SUMMARY INSIGHT BANNER */}
            <section className="insight-hero" aria-label="Executive Climate Insight">
              <div className="insight-badge">
                <CheckCircle size={16} />
                <span>EXECUTIVE SUMMARY INSIGHT</span>
              </div>

              {comparison?.available ? (
                <div className="insight-content">
                  <div className="insight-headline">
                    {comparison.percent_change != null ? (
                      comparison.percent_change > 0 ? (
                        <>
                          <TrendingUp className="trend-icon red" size={32} />
                          <span>
                            Heatwaves have <strong>increased by {comparison.percent_change.toFixed(1)}%</strong> in this
                            region since {comparison.first_period?.[0]}.
                          </span>
                        </>
                      ) : comparison.percent_change < 0 ? (
                        <>
                          <TrendingDown className="trend-icon green" size={32} />
                          <span>
                            Heatwaves have <strong>decreased by {Math.abs(comparison.percent_change).toFixed(1)}%</strong> in
                            this region since {comparison.first_period?.[0]}.
                          </span>
                        </>
                      ) : (
                        <>
                          <Minus className="trend-icon neutral" size={32} />
                          <span>Heatwave days remained unchanged between comparison periods.</span>
                        </>
                      )
                    ) : (
                      <>
                        <TrendingUp className="trend-icon red" size={32} />
                        <span>
                          Heatwaves increased by <strong>+{format(comparison.absolute_change)} days/year</strong>{" "}
                          (first-period baseline had 0 events).
                        </span>
                      </>
                    )}
                  </div>
                  <p className="insight-details">
                    Heatwave days averaged <b>{format(comparison.first_mean)} days/year</b> during {comparison.first_period?.join("–")}{" "}
                    and climbed to <b>{format(comparison.last_mean)} days/year</b> in {comparison.last_period?.join("–")}.
                  </p>
                </div>
              ) : (
                <p className="insight-note">{comparison?.reason || "Comparison requires at least 10 valid annual observations."}</p>
              )}
            </section>

            {/* Primary Metrics Grid */}
            <section className="metrics-grid" aria-label="Summary Statistics Cards">
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
                  R² = {hwTrend?.r_squared != null ? hwTrend.r_squared.toFixed(2) : "—"} · Based on {hwTrend?.n_years} usable years.
                </div>
              </article>

              {/* BONUS CHALLENGE 3: MANN-KENDALL TREND TEST CARD */}
              <article className="stat-card highlight">
                <div className="stat-header">
                  <span className="stat-title">Mann-Kendall Trend Test</span>
                  <span className={`stat-pill ${hwMk?.significant ? "significant" : "neutral"}`}>
                    {hwMk?.significant ? "Statistically Significant" : "Non-Significant"}
                  </span>
                </div>
                <div className="stat-value">
                  τ = {hwMk?.tau != null ? hwMk.tau.toFixed(3) : "—"}
                  <span className="unit"> (p = {hwMk?.p_value != null ? hwMk.p_value.toFixed(4) : "—"})</span>
                </div>
                <div className="stat-footer">
                  S = {hwMk?.s_statistic ?? "—"} · {hwMk?.interpretation || "Non-parametric monotonic rank test."}
                </div>
              </article>

              <article className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Data Completeness & Quality</span>
                  <span className="stat-pill">Quality Gates</span>
                </div>
                <div className="stat-value">
                  {usableYears} <span className="unit">/ {report.annual.length} usable years</span>
                </div>
                <div className="stat-footer">
                  {report.quality.missing_days} missing days · Gaps break runs without artificial interpolation.
                </div>
              </article>
            </section>

            {/* Interactive Trend Chart Panel */}
            <section className="panel chart-panel">
              <div className="chart-header">
                <div>
                  <h3 className="section-title">Annual Climate Hazard Indicators</h3>
                  <p className="section-subtitle">
                    Examine historical trajectory with 5-year trailing averages and linear decadal trends.
                  </p>
                </div>
                <div className="metric-toggle">
                  <label htmlFor="metric-select">Display Metric:</label>
                  <select
                    id="metric-select"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as Metric)}
                  >
                    {(Object.keys(metricNames) as Metric[]).map((key) => (
                      <option key={key} value={key}>
                        {metricNames[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <TrendChart annual={report.annual} metric={metric} trend={report.trends[metric as keyof typeof report.trends]} />

              <div className="chart-footnote">
                <span>Note: Excluded low-coverage years are blank, not zero. Trailing average requires 5 consecutive usable years.</span>
              </div>
            </section>

            {/* Methodology & Quality Auditing */}
            <section className="panel methodology-panel">
              <h3 className="section-title">Methodology, Assumptions & Data Quality</h3>
              <div className="method-grid">
                <div className="method-item">
                  <strong>Data Provenance:</strong>
                  <p>
                    Open-Meteo ERA5 Reanalysis ({report.source.data_type}) in {report.source.units}.
                    Baseline completeness (1961–1990): <b>{format(report.baseline.coverage * 100, 2)}%</b>.
                  </p>
                </div>
                <div className="method-item">
                  <strong>Acceptance Criteria:</strong>
                  <p>
                    Years require ≥ 95% overall daily coverage and ≥ 90% in every calendar month.
                    Excluded years: {report.quality.excluded_years.length ? report.quality.excluded_years.join(", ") : "None"}.
                  </p>
                </div>
              </div>

              <ul className="warnings-list">
                {report.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </section>

            {/* Annual Data Table */}
            <details className="panel collapsable-panel">
              <summary>
                <span>Annual Data Table ({report.annual.length} Years)</span>
              </summary>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Heatwave Days</th>
                      <th>5-Yr Rolling Avg</th>
                      <th>Event Starts</th>
                      <th>Longest Duration</th>
                      <th>Peak Excess (°C)</th>
                      <th>Coverage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.annual.map((row) => (
                      <tr key={row.year} className={!row.usable ? "row-excluded" : ""}>
                        <td><strong>{row.year}</strong></td>
                        <td>{format(row.heatwave_days, 0)}</td>
                        <td>{format(row.heatwave_days_rolling_5y, 1)}</td>
                        <td>{format(row.event_starts, 0)}</td>
                        <td>{format(row.longest_segment_days, 0)} days</td>
                        <td>{format(row.peak_excess_c, 1)}</td>
                        <td>{format(row.coverage * 100, 1)}%</td>
                        <td>
                          <span className={`status-pill ${row.usable ? "usable" : "excluded"}`}>
                            {row.usable ? "Usable" : "Excluded"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            {/* Qualifying Events Table */}
            <details className="panel collapsable-panel">
              <summary>
                <span>Detected Heatwave Events Intersecting Range ({report.events.length})</span>
              </summary>
              <div className="table-wrapper">
                {!report.events.length ? (
                  <p className="no-events">No qualifying runs detected in the observation period.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Duration (Days)</th>
                        <th>Peak Tmax (°C)</th>
                        <th>Excess Above 95th %ile</th>
                        <th>Boundary Clipped?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.events.slice(0, 100).map((ev, i) => (
                        <tr key={i}>
                          <td>{ev.start_in_range}</td>
                          <td>{ev.end_in_range}</td>
                          <td><strong>{ev.days_in_range} days</strong></td>
                          <td>{format(ev.peak_tmax_c, 1)} °C</td>
                          <td>+{format(ev.peak_excess_c, 1)} °C</td>
                          <td>{ev.clipped_to_selection || ev.duration_censored ? "Yes (Censored)" : "Complete"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </details>
          </div>
        )}

        {/* Footer */}
        <footer className="app-footer">
          <div>
            Weather reanalysis powered by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> (ECMWF ERA5).
            Licensed under <a href="https://open-meteo.com/en/licence" target="_blank" rel="noreferrer">CC BY 4.0</a>.
          </div>
          <div>Built for Dygnify Ventures Climate Hazard Case Study · Full Stack Implementation with FastAPI, React & MongoDB</div>
        </footer>
      </main>
    </div>
  );
}
