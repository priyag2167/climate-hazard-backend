import { apiUrl, fetchJson } from "./api";
import type { Hazard, Region, Report } from "../types";

export interface AnalysisParams {
  regionId: string;
  startYear: number;
  endYear: number;
  hazard?: string;
  latitude?: number | null;
  longitude?: number | null;
  regionName?: string | null;
  minLat?: number | null;
  maxLat?: number | null;
  minLon?: number | null;
  maxLon?: number | null;
}

export interface RegionsResponse {
  regions: Region[];
  hazards: Hazard[];
  max_year: number;
}

/**
 * Builds URL search query string for analysis and CSV download endpoints.
 */
export function buildQueryParams(params: AnalysisParams): string {
  const query = new URLSearchParams({
    region_id: params.regionId,
    start_year: String(params.startYear),
    end_year: String(params.endYear),
    hazard: params.hazard || "heatwave",
  });

  if (
    params.regionId === "custom" ||
    params.regionId.startsWith("point_") ||
    params.regionId.startsWith("box_")
  ) {
    if (params.latitude != null && params.longitude != null) {
      query.set("latitude", String(params.latitude));
      query.set("longitude", String(params.longitude));
    }
    if (params.regionName) {
      query.set("region_name", params.regionName);
    }
    if (
      params.minLat != null &&
      params.maxLat != null &&
      params.minLon != null &&
      params.maxLon != null
    ) {
      query.set("min_lat", String(params.minLat));
      query.set("max_lat", String(params.maxLat));
      query.set("min_lon", String(params.minLon));
      query.set("max_lon", String(params.maxLon));
    }
  }

  return query.toString();
}

/**
 * Fetches available regions, hazards, and max allowable year from backend.
 */
export function fetchRegions(signal?: AbortSignal): Promise<RegionsResponse> {
  return fetchJson<RegionsResponse>("/api/regions", signal);
}

/**
 * Fetches climate hazard analysis report.
 */
export function fetchAnalysis(
  params: AnalysisParams,
  signal?: AbortSignal
): Promise<Report> {
  return fetchJson<Report>(`/api/analysis?${buildQueryParams(params)}`, signal);
}

/**
 * Returns the download URL for annual CSV data.
 */
export function getAnalysisCsvUrl(params: AnalysisParams): string {
  return apiUrl(`/api/analysis.csv?${buildQueryParams(params)}`);
}
