import React from "react";
import { Globe } from "lucide-react";

export function Navbar(): React.ReactElement {
  return (
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
  );
}
