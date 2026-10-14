import { useState, useRef, useCallback } from "react";
import { fetchAnalysis } from "../services/analysisService";
import type { AnalysisParams } from "../services/analysisService";
import type { Report } from "../types";

export interface UseAnalysisResult {
  report: Report | null;
  busy: boolean;
  error: string;
  runAnalysis: (params: AnalysisParams) => Promise<Report | null>;
  setReport: (report: Report | null) => void;
  setError: (error: string) => void;
}

export function useAnalysis(): UseAnalysisResult {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const abortControllerRef = useRef<AbortController | null>(null);

  const runAnalysis = useCallback(async (params: AnalysisParams): Promise<Report | null> => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setError("");
    setReport(null);
    setBusy(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 120_000);

    try {
      const result = await fetchAnalysis(params, controller.signal);
      setReport(result);
      return result;
    } catch (err) {
      const isAborted = controller.signal.aborted;
      const message = isAborted
        ? "Analysis timed out. Retry: completed data chunks are stored in MongoDB."
        : err instanceof Error
        ? err.message
        : "Analysis request failed.";
      setError(message);
      return null;
    } finally {
      window.clearTimeout(timer);
      setBusy(false);
      abortControllerRef.current = null;
    }
  }, []);

  return {
    report,
    busy,
    error,
    runAnalysis,
    setReport,
    setError,
  };
}
