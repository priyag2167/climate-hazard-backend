import React from "react";
import { Layers, MapPin, Flame, Calendar, BarChart3 } from "lucide-react";
import type { Region, RegionSelectionType } from "../../../types";
import { QUICK_PRESETS } from "../../../utils/constants";
import { RegionMap } from "../../../components/map/RegionMap";

interface ControlsPanelProps {
  regions: Region[];
  regionType: RegionSelectionType;
  setRegionType: (type: RegionSelectionType) => void;
  selectedPreset: string;
  onPresetChange: (regionId: string) => void;
  customLat: number;
  setCustomLat: (lat: number) => void;
  customLon: number;
  setCustomLon: (lon: number) => void;
  customName: string;
  boxMinLat: number;
  setBoxMinLat: (lat: number) => void;
  boxMaxLat: number;
  setBoxMaxLat: (lat: number) => void;
  boxMinLon: number;
  setBoxMinLon: (lon: number) => void;
  boxMaxLon: number;
  setBoxMaxLon: (lon: number) => void;
  hazard: "heatwave" | "heavy_rainfall";
  setHazard: (hazard: "heatwave" | "heavy_rainfall") => void;
  startYear: number;
  setStartYear: (year: number) => void;
  endYear: number;
  setEndYear: (year: number) => void;
  maxYear: number;
  busy: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onLocationSelect: (lat: number, lon: number, name?: string) => void;
}

export function ControlsPanel({
  regions,
  regionType,
  setRegionType,
  selectedPreset,
  onPresetChange,
  customLat,
  setCustomLat,
  customLon,
  setCustomLon,
  customName,
  boxMinLat,
  setBoxMinLat,
  boxMaxLat,
  setBoxMaxLat,
  boxMinLon,
  setBoxMinLon,
  boxMaxLon,
  setBoxMaxLon,
  hazard,
  setHazard,
  startYear,
  setStartYear,
  endYear,
  setEndYear,
  maxYear,
  busy,
  onSubmit,
  onLocationSelect,
}: ControlsPanelProps): React.ReactElement {
  return (
    <section className="panel controls-panel" aria-label="Analysis Configuration">
      <div className="panel-header">
        <div className="panel-title">
          <Layers size={18} />
          <span>Select Hazard, Region & Time Horizon</span>
        </div>
        <div className="preset-tabs">
          <button
            type="button"
            className={`tab-btn ${regionType === "preset" ? "active" : ""}`}
            onClick={() => setRegionType("preset")}
          >
            Predefined Regions
          </button>
          <button
            type="button"
            className={`tab-btn ${regionType === "custom" ? "active" : ""}`}
            onClick={() => setRegionType("custom")}
          >
            Custom Coordinates / Map
          </button>
          <button
            type="button"
            className={`tab-btn ${regionType === "box" ? "active" : ""}`}
            onClick={() => setRegionType("box")}
          >
            Lat-Lon Bounding Box
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="controls-form">
        <div className="form-grid">
          {/* Preset Region Dropdown */}
          {regionType === "preset" && (
            <div className="form-group">
              <label htmlFor="region-select">
                <MapPin size={15} /> Pre-configured Region / State
              </label>
              <select
                id="region-select"
                value={selectedPreset}
                onChange={(e) => onPresetChange(e.target.value)}
                disabled={busy || !regions.length}
              >
                <optgroup label="Metros & Major Cities">
                  {regions
                    .filter((r) => r.category === "City")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="States">
                  {regions
                    .filter((r) => r.category === "State")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="International Hubs">
                  {regions
                    .filter((r) => r.category === "International")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Custom Point Inputs */}
          {regionType === "custom" && (
            <>
              <div className="form-group">
                <label>
                  <MapPin size={15} /> Custom Latitude (°N)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  value={customLat}
                  required
                  disabled={busy}
                  onChange={(e) => setCustomLat(parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>
                  <MapPin size={15} /> Custom Longitude (°E)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  value={customLon}
                  required
                  disabled={busy}
                  onChange={(e) => setCustomLon(parseFloat(e.target.value))}
                />
              </div>
            </>
          )}

          {/* Bounding Box Inputs */}
          {regionType === "box" && (
            <>
              <div className="form-group">
                <label>Min Lat / Max Lat (°N)</label>
                <div className="input-pair">
                  <input
                    type="number"
                    step="0.1"
                    value={boxMinLat}
                    onChange={(e) => setBoxMinLat(parseFloat(e.target.value))}
                    disabled={busy}
                    placeholder="Min Lat"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={boxMaxLat}
                    onChange={(e) => setBoxMaxLat(parseFloat(e.target.value))}
                    disabled={busy}
                    placeholder="Max Lat"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Min Lon / Max Lon (°E)</label>
                <div className="input-pair">
                  <input
                    type="number"
                    step="0.1"
                    value={boxMinLon}
                    onChange={(e) => setBoxMinLon(parseFloat(e.target.value))}
                    disabled={busy}
                    placeholder="Min Lon"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={boxMaxLon}
                    onChange={(e) => setBoxMaxLon(parseFloat(e.target.value))}
                    disabled={busy}
                    placeholder="Max Lon"
                  />
                </div>
              </div>
            </>
          )}

          {/* Hazard Selection */}
          <div className="form-group">
            <label htmlFor="hazard-select">
              <Flame size={15} /> Hazard Type
            </label>
            <select
              id="hazard-select"
              value={hazard}
              onChange={(e) => setHazard(e.target.value as "heatwave" | "heavy_rainfall")}
              disabled={busy}
            >
              <option value="heatwave">Heatwave (Default · 95th %ile Tmax)</option>
              <option value="heavy_rainfall">Heavy Rainfall (Extreme Precipitation)</option>
            </select>
          </div>

          {/* Time Horizon Selection */}
          <div className="form-group">
            <label>
              <Calendar size={15} /> Time Range
            </label>
            <div className="input-pair">
              <input
                type="number"
                min="1950"
                max={maxYear}
                value={startYear}
                required
                disabled={busy}
                onChange={(e) => setStartYear(Number(e.target.value))}
                title="Start Year"
              />
              <span className="pair-separator">to</span>
              <input
                type="number"
                min="1950"
                max={maxYear}
                value={endYear}
                required
                disabled={busy}
                onChange={(e) => setEndYear(Number(e.target.value))}
                title="End Year"
              />
            </div>
          </div>
        </div>

        {/* Quick Presets & Submit */}
        <div className="controls-footer">
          <div className="quick-presets">
            <span className="preset-label">Quick Presets:</span>
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="preset-chip"
                onClick={() => {
                  setStartYear(preset.startYear);
                  setEndYear(preset.endYear);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button type="submit" className="submit-btn" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner"></span> Analyzing Weather Data…
              </>
            ) : (
              <>
                <BarChart3 size={18} /> Analyze Trends
              </>
            )}
          </button>
        </div>
      </form>

      {/* Interactive Map */}
      <RegionMap
        selectedLat={regionType === "box" ? (boxMinLat + boxMaxLat) / 2 : customLat}
        selectedLon={regionType === "box" ? (boxMinLon + boxMaxLon) / 2 : customLon}
        regionName={regionType === "box" ? "Bounding Box Area" : customName}
        regions={regions}
        boundingBox={
          regionType === "box"
            ? { min_lat: boxMinLat, max_lat: boxMaxLat, min_lon: boxMinLon, max_lon: boxMaxLon }
            : null
        }
        onLocationSelect={onLocationSelect}
      />
    </section>
  );
}
