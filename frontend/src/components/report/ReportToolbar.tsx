import React from "react";
import { Download, FileText } from "lucide-react";
import type { Report } from "../../types";
import { getAnalysisCsvUrl } from "../../services/analysisService";

interface ReportToolbarProps {
  report: Report;
  exportingPdf: boolean;
  onExportPdf: () => void;
}

export function ReportToolbar({
  report,
  exportingPdf,
  onExportPdf,
}: ReportToolbarProps): React.ReactElement {
  const csvUrl = getAnalysisCsvUrl({
    regionId: report.region.id,
    startYear: report.selection.start_year,
    endYear: report.selection.end_year,
    hazard: report.hazard,
    latitude: report.region.latitude,
    longitude: report.region.longitude,
    regionName: report.region.name,
  });

  return (
    <div className="results-toolbar">
      <div>
        <h2>
          {report.region.name} · {report.selection.start_year}–{report.selection.end_year}
        </h2>
        <div className="meta-subtext">
          <span>
            Coordinates: {report.region.latitude.toFixed(3)}°N, {report.region.longitude.toFixed(3)}°E
          </span>
          <span>•</span>
          <span>Timezone: {report.source.timezone}</span>
          <span>•</span>
          <span className={`cache-badge ${report.cache.analysis_hit ? "hit" : "miss"}`}>
            {report.cache.analysis_hit
              ? "⚡ Loaded from MongoDB Cache"
              : "Fresh Reanalysis Computed & Stored"}
          </span>
        </div>
      </div>

      <div className="export-actions">
        <button
          type="button"
          className="btn-action primary"
          onClick={onExportPdf}
          disabled={exportingPdf}
          title="Export High-Resolution PDF"
        >
          <FileText size={16} />
          {exportingPdf ? "Generating PDF…" : "Export PDF Report"}
        </button>
        <a
          className="btn-action secondary"
          href={csvUrl}
          download
          title="Download Annual CSV Data"
        >
          <Download size={16} /> Export CSV
        </a>
      </div>
    </div>
  );
}
