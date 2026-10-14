import type { Metric } from "../types";

export const METRIC_NAMES: Record<Metric, string> = {
  heatwave_days: "Heatwave Days (Annual Total)",
  event_starts: "Heatwave Event Starts (Frequency)",
  longest_segment_days: "Longest Heatwave Duration (Days)",
  peak_excess_c: "Peak Heatwave Excess Above 95th Percentile (°C)",
};

export const QUICK_PRESETS = [
  { label: "1990–2020 (Brief Default)", startYear: 1990, endYear: 2020 },
  { label: "1980–2023 (44 yrs)", startYear: 1980, endYear: 2023 },
  { label: "2000–2024 (Recent)", startYear: 2000, endYear: 2024 },
] as const;
