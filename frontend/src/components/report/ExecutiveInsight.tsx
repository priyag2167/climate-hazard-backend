import React from "react";
import { CheckCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Comparison } from "../../types";
import { format } from "../../utils/formatters";

interface ExecutiveInsightProps {
  comparison?: Comparison;
}

export function ExecutiveInsight({ comparison }: ExecutiveInsightProps): React.ReactElement {
  return (
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
                    Heatwaves have <strong>increased by {comparison.percent_change.toFixed(1)}%</strong> in this region
                    since {comparison.first_period?.[0]}.
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
            Heatwave days averaged <b>{format(comparison.first_mean)} days/year</b> during{" "}
            {comparison.first_period?.join("–")} and climbed to <b>{format(comparison.last_mean)} days/year</b> in{" "}
            {comparison.last_period?.join("–")}.
          </p>
        </div>
      ) : (
        <p className="insight-note">
          {comparison?.reason || "Comparison requires at least 10 valid annual observations."}
        </p>
      )}
    </section>
  );
}
