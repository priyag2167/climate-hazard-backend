import React from "react";
import { Database } from "lucide-react";

export function LoadingBanner(): React.ReactElement {
  return (
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
  );
}
