import React from "react";
import { Flame } from "lucide-react";

export function HeroSection(): React.ReactElement {
  return (
    <header className="hero-section">
      <div className="eyebrow-tag">
        <Flame size={14} className="icon-pulse" />
        <span>CLIMATE RISK & EXTREME EVENT ANALYZER</span>
      </div>
      <h1>Historical Climate Hazard Trends</h1>
      <p className="hero-description">
        Evaluate long-term changes in extreme heatwave frequency, duration, and intensity with
        rigorous 95th-percentile baseline rules, linear regression, and non-parametric
        Mann-Kendall trend tests.
      </p>
    </header>
  );
}
