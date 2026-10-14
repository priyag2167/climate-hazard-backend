import React, { useState } from "react";
import type { Metric, Report } from "../../../types";
import { METRIC_NAMES } from "../../../utils/constants";
import { TrendChart } from "../../../components/charts/TrendChart";
import {
  ReportToolbar,
  ExecutiveInsight,
  MetricsGrid,
  MethodologyPanel,
  AnnualDataTable,
  EventsTable,
} from "../../../components/report";

interface ReportDashboardProps {
  report: Report;
  exportingPdf: boolean;
  onExportPdf: () => void;
}

export function ReportDashboard({
  report,
  exportingPdf,
  onExportPdf,
}: ReportDashboardProps): React.ReactElement {
  const [metric, setMetric] = useState<Metric>("heatwave_days");

  return (
    <div id="climate-report-container" className="report-container">
      {/* 1. Header & Export Toolbar */}
      <ReportToolbar
        report={report}
        exportingPdf={exportingPdf}
        onExportPdf={onExportPdf}
      />

      {/* 2. Executive Summary Insight Banner */}
      <ExecutiveInsight comparison={report.comparison} />

      {/* 3. Primary Metrics Statistics Grid */}
      <MetricsGrid report={report} />

      {/* 4. Interactive Trend Chart Panel */}
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
              {(Object.keys(METRIC_NAMES) as Metric[]).map((key) => (
                <option key={key} value={key}>
                  {METRIC_NAMES[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TrendChart
          annual={report.annual}
          metric={metric}
          trend={report.trends[metric as keyof typeof report.trends]}
        />

        <div className="chart-footnote">
          <span>
            Note: Excluded low-coverage years are blank, not zero. Trailing average requires 5
            consecutive usable years.
          </span>
        </div>
      </section>

      {/* 5. Methodology & Quality Auditing */}
      <MethodologyPanel report={report} />

      {/* 6. Collapsible Annual Data Table */}
      <AnnualDataTable annual={report.annual} />

      {/* 7. Collapsible Qualifying Events Table */}
      <EventsTable events={report.events} />
    </div>
  );
}
