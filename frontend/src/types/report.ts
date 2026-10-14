import type { Region } from "./region";

export interface Annual {
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
}

export interface EventRow {
  observed_start: string;
  observed_end: string;
  start_in_range: string;
  end_in_range: string;
  days_in_range: number;
  duration_censored: boolean;
  clipped_to_selection: boolean;
  peak_tmax_c: number;
  peak_excess_c: number;
}

export interface Comparison {
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
}

export interface Trend {
  slope_per_decade: number | null;
  r_squared: number | null;
  n_years: number;
  reason: string | null;
}

export interface MannKendall {
  tau: number | null;
  p_value: number | null;
  z_score: number | null;
  s_statistic: number | null;
  trend: "increasing" | "decreasing" | "no_trend" | "insufficient_data";
  significant: boolean;
  n_years: number;
  interpretation: string;
}

export interface QualityMetadata {
  missing_days: number;
  excluded_years: number[];
  annual_min_coverage: number;
  monthly_min_coverage: number;
  ingestion_anomalies?: Record<string, number>;
}

export interface DataSourceMetadata {
  provider: string;
  model: string;
  data_type: string;
  units: string;
  timezone: string;
}

export interface Report {
  hazard: string;
  region: Region;
  selection: {
    start_year: number;
    end_year: number;
    hazard?: string;
  };
  threshold_c: number;
  baseline: {
    start_year: number;
    end_year: number;
    coverage: number;
    valid_days?: number;
  };
  annual: Annual[];
  events: EventRow[];
  comparison: Comparison;
  trends: Record<"heatwave_days" | "event_starts" | "longest_segment_days", Trend>;
  mann_kendall: Record<"heatwave_days" | "event_starts" | "longest_segment_days", MannKendall>;
  quality: QualityMetadata;
  warnings: string[];
  source: DataSourceMetadata;
  cache: {
    analysis_hit: boolean;
  };
  computed_at: string;
}
