import React, { useState } from "react";
import type { RegionSelectionType } from "../../types";
import { useRegions, useAnalysis } from "../../hooks";
import { exportReportToPDF } from "../../services/exportService";
import {
  Footer,
  LoadingBanner,
  ErrorBanner,
  EmptyState,
} from "../../components/common";
import { HeroSection } from "./components/HeroSection";
import { ControlsPanel } from "./components/ControlsPanel";
import { ReportDashboard } from "./components/ReportDashboard";

export function DashboardScreen(): React.ReactElement {
  const { regions, maxYear } = useRegions();
  const { report, busy, error, runAnalysis, setError } = useAnalysis();

  const [regionType, setRegionType] = useState<RegionSelectionType>("preset");
  const [selectedPreset, setSelectedPreset] = useState<string>("delhi");
  const [customLat, setCustomLat] = useState<number>(28.6139);
  const [customLon, setCustomLon] = useState<number>(77.209);
  const [customName, setCustomName] = useState<string>("Delhi");

  // Bounding box state
  const [boxMinLat, setBoxMinLat] = useState<number>(27.5);
  const [boxMaxLat, setBoxMaxLat] = useState<number>(29.5);
  const [boxMinLon, setBoxMinLon] = useState<number>(76.2);
  const [boxMaxLon, setBoxMaxLon] = useState<number>(78.2);

  const [hazard, setHazard] = useState<"heatwave" | "heavy_rainfall">("heatwave");
  const [startYear, setStartYear] = useState<number>(1990);
  const [endYear, setEndYear] = useState<number>(2020);

  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  // Update map coordinates when preset changes
  function handlePresetChange(regId: string) {
    setSelectedPreset(regId);
    const found = regions.find((r) => r.id === regId);
    if (found) {
      setCustomLat(found.latitude);
      setCustomLon(found.longitude);
      setCustomName(found.name);
    }
  }

  // Handle map click or marker drag
  function handleLocationSelect(lat: number, lon: number, name?: string) {
    setCustomLat(lat);
    setCustomLon(lon);
    if (name) setCustomName(name);
    setRegionType("custom");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (
      !Number.isInteger(startYear) ||
      !Number.isInteger(endYear) ||
      startYear < 1950 ||
      endYear > maxYear ||
      startYear > endYear ||
      endYear - startYear + 1 > 80
    ) {
      setError(`Choose whole years from 1950 to ${maxYear}, ordered, spanning at most 80 years.`);
      return;
    }

    const params = {
      regionId: regionType === "preset" ? selectedPreset : "custom",
      startYear,
      endYear,
      hazard,
      latitude: regionType === "custom" ? customLat : undefined,
      longitude: regionType === "custom" ? customLon : undefined,
      regionName: regionType === "custom" ? customName : undefined,
      minLat: regionType === "box" ? boxMinLat : undefined,
      maxLat: regionType === "box" ? boxMaxLat : undefined,
      minLon: regionType === "box" ? boxMinLon : undefined,
      maxLon: regionType === "box" ? boxMaxLon : undefined,
    };

    await runAnalysis(params);
  }

  async function handleExportPDF() {
    if (!report) return;
    setExportingPdf(true);
    try {
      await exportReportToPDF("climate-report-container", report);
    } catch {
      alert("Failed to generate PDF. You can also print the page to PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <main className="main-content">
      {/* 1. Header Hero */}
      <HeroSection />

      {/* 2. Configuration Controls Panel */}
      <ControlsPanel
        regions={regions}
        regionType={regionType}
        setRegionType={setRegionType}
        selectedPreset={selectedPreset}
        onPresetChange={handlePresetChange}
        customLat={customLat}
        setCustomLat={setCustomLat}
        customLon={customLon}
        setCustomLon={setCustomLon}
        customName={customName}
        boxMinLat={boxMinLat}
        setBoxMinLat={setBoxMinLat}
        boxMaxLat={boxMaxLat}
        setBoxMaxLat={setBoxMaxLat}
        boxMinLon={boxMinLon}
        setBoxMinLon={setBoxMinLon}
        boxMaxLon={boxMaxLon}
        setBoxMaxLon={setBoxMaxLon}
        hazard={hazard}
        setHazard={setHazard}
        startYear={startYear}
        setStartYear={setStartYear}
        endYear={endYear}
        setEndYear={setEndYear}
        maxYear={maxYear}
        busy={busy}
        onSubmit={handleSubmit}
        onLocationSelect={handleLocationSelect}
      />

      {/* 3. Loading Notice State */}
      {busy && <LoadingBanner />}

      {/* 4. Error Alert Banner */}
      {error && <ErrorBanner message={error} />}

      {/* 5. Empty State Prompt */}
      {!busy && !report && !error && <EmptyState />}

      {/* 6. Analysis Results Display */}
      {report && (
        <ReportDashboard
          report={report}
          exportingPdf={exportingPdf}
          onExportPdf={handleExportPDF}
        />
      )}

      {/* 7. Footer */}
      <Footer />
    </main>
  );
}
