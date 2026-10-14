import React from "react";
import type { EventRow } from "../../types";
import { format } from "../../utils/formatters";

interface EventsTableProps {
  events: EventRow[];
}

export function EventsTable({ events }: EventsTableProps): React.ReactElement {
  return (
    <details className="panel collapsable-panel">
      <summary>
        <span>Detected Heatwave Events Intersecting Range ({events.length})</span>
      </summary>
      <div className="table-wrapper">
        {!events.length ? (
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
              {events.slice(0, 100).map((ev, i) => (
                <tr key={i}>
                  <td>{ev.start_in_range}</td>
                  <td>{ev.end_in_range}</td>
                  <td>
                    <strong>{ev.days_in_range} days</strong>
                  </td>
                  <td>{format(ev.peak_tmax_c, 1)} °C</td>
                  <td>+{format(ev.peak_excess_c, 1)} °C</td>
                  <td>
                    {ev.clipped_to_selection || ev.duration_censored
                      ? "Yes (Censored)"
                      : "Complete"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}
