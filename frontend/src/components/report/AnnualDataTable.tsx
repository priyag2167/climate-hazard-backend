import React from "react";
import type { Annual } from "../../types";
import { format } from "../../utils/formatters";

interface AnnualDataTableProps {
  annual: Annual[];
}

export function AnnualDataTable({ annual }: AnnualDataTableProps): React.ReactElement {
  return (
    <details className="panel collapsable-panel">
      <summary>
        <span>Annual Data Table ({annual.length} Years)</span>
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
            {annual.map((row) => (
              <tr key={row.year} className={!row.usable ? "row-excluded" : ""}>
                <td>
                  <strong>{row.year}</strong>
                </td>
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
  );
}
