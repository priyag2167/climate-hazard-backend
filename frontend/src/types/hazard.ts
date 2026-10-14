export type HazardType = "heatwave" | "heavy_rainfall";

export interface Hazard {
  id: HazardType;
  name: string;
  variable: string;
  units: string;
  description: string;
}

export type Metric =
  | "heatwave_days"
  | "event_starts"
  | "longest_segment_days"
  | "peak_excess_c";
