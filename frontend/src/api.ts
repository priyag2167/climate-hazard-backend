import type { Report } from "./types";

const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const apiUrl = (path: string) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

export type AnalysisParams = {
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
};

export function buildQueryParams(params: AnalysisParams): string {
  const query = new URLSearchParams({
    region_id: params.regionId,
    start_year: String(params.startYear),
    end_year: String(params.endYear),
    hazard: params.hazard || "heatwave",
  });

  if (params.regionId === "custom" || params.regionId.startsWith("point_") || params.regionId.startsWith("box_")) {
    if (params.latitude != null && params.longitude != null) {
      query.set("latitude", String(params.latitude));
      query.set("longitude", String(params.longitude));
    }
    if (params.regionName) {
      query.set("region_name", params.regionName);
    }
    if (params.minLat != null && params.maxLat != null && params.minLon != null && params.maxLon != null) {
      query.set("min_lat", String(params.minLat));
      query.set("max_lat", String(params.maxLat));
      query.set("min_lon", String(params.minLon));
      query.set("max_lon", String(params.maxLon));
    }
  }

  return query.toString();
}

export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path), { signal, headers: { Accept: "application/json" } });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("The API did not return valid JSON. Verify backend is running.");
  }
  if (!response.ok) {
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : Array.isArray(body.detail)
        ? body.detail.map((item: { msg: string }) => item.msg).join(" ")
        : `Request failed (${response.status}).`;
    const wait = response.headers.get("Retry-After");
    throw new Error(wait ? `${detail} Retry after ${wait} seconds.` : detail);
  }
  return body as T;
}

export function fetchAnalysis(params: AnalysisParams, signal?: AbortSignal): Promise<Report> {
  return fetchJson<Report>(`/api/analysis?${buildQueryParams(params)}`, signal);
}
