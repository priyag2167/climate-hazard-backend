import React from "react";
import { Globe } from "lucide-react";

export function EmptyState(): React.ReactElement {
  return (
    <div className="empty-state">
      <Globe size={48} className="empty-icon" />
      <h3>Ready to Analyze Historical Hazards</h3>
      <p>
        Select a city, click anywhere on the map, or choose a custom bounding box, then press{" "}
        <strong>Analyze Trends</strong>.
      </p>
    </div>
  );
}
