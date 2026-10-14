export type Region = {
  id: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  bounding_box?: { min_lat: number; max_lat: number; min_lon: number; max_lon: number };
};

export type Hazard = {
  id: "heatwave" | "heavy_rainfall";
  name: string;
  variable: string;
  units: string;
  description: string;
};

export type Metric = "heatwave_days" | "event_starts" | "longest_segment_days" | "peak_excess_c";

export type Annual = {
  year: number;
  coverage: number;
  usable: boolean;
  valid_days: number;
  expected_days: number;
  heatwave_days: number | null;
  event_starts: number | null;
  longest_segment_days: number | null;
  peak_excess_c: number | null;
  heatwave_days_rolling_5y: number | null;
  event_starts_rolling_5y: number | null;
  longest_segment_days_rolling_5y: number | null;
};

export type EventRow = {
  observed_start: string;
  observed_end: string;
  start_in_range: string;
  end_in_range: string;
  days_in_range: number;
  duration_censored: boolean;
  clipped_to_selection: boolean;
  peak_tmax_c: number;
  peak_excess_c: number;
};

export type Comparison = {
  available: boolean;
  metric?: string;
  reason?: string;
  first_period?: number[];
  last_period?: number[];
  first_mean?: number;
  last_mean?: number;
  absolute_change?: number;
  percent_change?: number | null;
  percent_note?: string | null;
};

export type Trend = {
  slope_per_decade: number | null;
  r_squared: number | null;
  n_years: number;
  reason: string | null;
};

export type MannKendall = {
  tau: number | null;
  p_value: number | null;
  z_score: number | null;
  s_statistic: number | null;
  trend: "increasing" | "decreasing" | "no_trend" | "insufficient_data";
  significant: boolean;
  n_years: number;
  interpretation: string;
};

export type Report = {
  hazard: string;
  region: Region;
  selection: { start_year: number; end_year: number; hazard?: string };
  threshold_c: number;
  baseline: { start_year: number; end_year: number; coverage: number; valid_days?: number };
  annual: Annual[];
  events: EventRow[];
  comparison: Comparison;
  trends: Record<"heatwave_days" | "event_starts" | "longest_segment_days", Trend>;
  mann_kendall: Record<"heatwave_days" | "event_starts" | "longest_segment_days", MannKendall>;
  quality: {
    missing_days: number;
    excluded_years: number[];
    annual_min_coverage: number;
    monthly_min_coverage: number;
    ingestion_anomalies?: Record<string, number>;
  };
  warnings: string[];
  source: {
    provider: string;
    model: string;
    data_type: string;
    units: string;
    timezone: string;
  };
  cache: { analysis_hit: boolean };
  computed_at: string;
};
