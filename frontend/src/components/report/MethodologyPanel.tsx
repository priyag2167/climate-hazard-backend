import React from "react";
import type { Report } from "../../types";
import { format } from "../../utils/formatters";

interface MethodologyPanelProps {
  report: Report;
}

export function MethodologyPanel({ report }: MethodologyPanelProps): React.ReactElement {
  return (
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
            Years require ≥ 95% overall daily coverage and ≥ 90% in every calendar month. Excluded
            years:{" "}
            {report.quality.excluded_years.length
              ? report.quality.excluded_years.join(", ")
              : "None"}
            .
          </p>
        </div>
      </div>

      <ul className="warnings-list">
        {report.warnings.map((warn, i) => (
          <li key={i}>{warn}</li>
        ))}
      </ul>
    </section>
  );
}
