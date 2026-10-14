import { useEffect, useState } from "react";
import { fetchRegions } from "../services/analysisService";
import type { Hazard, Region } from "../types";

export interface UseRegionsResult {
  regions: Region[];
  hazards: Hazard[];
  maxYear: number;
  loading: boolean;
  error: string | null;
}

export function useRegions(): UseRegionsResult {
  const [regions, setRegions] = useState<Region[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [maxYear, setMaxYear] = useState<number>(new Date().getFullYear() - 1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchRegions(controller.signal)
      .then((data) => {
        setRegions(data.regions);
        setHazards(data.hazards || []);
        if (data.max_year) {
          setMaxYear(data.max_year);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return { regions, hazards, maxYear, loading, error };
}
