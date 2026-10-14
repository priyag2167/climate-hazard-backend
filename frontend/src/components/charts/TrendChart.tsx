import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import type { Annual, Metric, Trend } from "../../types";
import { METRIC_NAMES } from "../../utils/constants";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

export const metricNames = METRIC_NAMES;

export interface TrendChartProps {
  annual: Annual[];
  metric: Metric;
  trend?: Trend;
}

export function TrendChart({ annual, metric, trend }: TrendChartProps) {
  const data = useMemo<ChartData<"line">>(() => {
    const years = annual.map((row) => row.year);
    const primaryValues = annual.map((row) => row[metric]);

    const datasets: ChartData<"line">["datasets"] = [
      {
        label: METRIC_NAMES[metric],
        data: primaryValues,
        borderColor: "#ca5532",
        backgroundColor: "rgba(202, 85, 50, 0.08)",
        borderWidth: 2.5,
        pointBackgroundColor: "#ca5532",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: true,
        spanGaps: false,
      },
    ];

    // Trailing 5-year average
    if (metric !== "peak_excess_c") {
      const key = `${metric}_rolling_5y` as const;
      datasets.push({
        label: "Trailing 5-Year Average",
        data: annual.map((row) => row[key]),
        borderColor: "#1b4952",
        borderDash: [5, 4],
        borderWidth: 2,
        pointRadius: 0,
        spanGaps: false,
      });
    }

    // Linear Trend Line (if available)
    if (trend && trend.slope_per_decade != null && annual.length >= 10) {
      const valid = annual.filter((r) => r[metric] != null);
      if (valid.length >= 10) {
        const meanX = valid.reduce((s, r) => s + r.year, 0) / valid.length;
        const meanY = valid.reduce((s, r) => s + (r[metric] ?? 0), 0) / valid.length;
        const annualSlope = trend.slope_per_decade / 10.0;

        const trendValues = years.map((yr) => {
          const val = meanY + annualSlope * (yr - meanX);
          return Math.max(0, Math.round(val * 10) / 10);
        });

        datasets.push({
          label: `Linear Trend (${trend.slope_per_decade > 0 ? "+" : ""}${trend.slope_per_decade.toFixed(1)}/decade)`,
          data: trendValues,
          borderColor: "#7c8e8f",
          borderDash: [2, 2],
          borderWidth: 1.5,
          pointRadius: 0,
          spanGaps: true,
        });
      }
    }

    return {
      labels: years.map((yr) => String(yr)),
      datasets,
    };
  }, [annual, metric, trend]);

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: { family: "Inter, sans-serif", size: 12 },
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: "rgba(23, 63, 72, 0.95)",
        titleFont: { size: 13, weight: "bold" },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(0, 0, 0, 0.04)" },
        title: { display: true, text: "Calendar Year", font: { weight: "bold", size: 12 } },
        ticks: { maxTicksLimit: 14 },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0, 0, 0, 0.06)" },
        title: {
          display: true,
          text:
            metric === "peak_excess_c"
              ? "°C Above Threshold"
              : metric === "event_starts"
              ? "Number of Events"
              : "Days / Year",
          font: { weight: "bold", size: 12 },
        },
      },
    },
  };

  return (
    <div className="chart-canvas-container">
      <Line
        data={data}
        options={options}
        role="img"
        aria-label={`${METRIC_NAMES[metric]} over time with trend lines`}
      />
    </div>
  );
}
