import React, { useState } from "react";
import {
  Play,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  Waves,
  Gauge,
  Layers,
  Sliders,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CellSusceptibilityExplanation } from "@/lib/flood-sim/susceptibility-types.ts";

export interface ScenarioPreset {
  id: "rainfall" | "outburst";
  name: string;
  badge: string;
  description: string;
  sourcePeakStageMeters: number;
  minFlowSpeed: number;
  maxFlowSpeed: number;
  maxLateralDistanceMeters: number;
  stageDecayPerMeter: number;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "rainfall",
    name: "Heavy rainfall flash flood",
    badge: "Pluvial Runoff Scenario",
    description:
      "Simulates widespread high-velocity flow routing through steep Himalayan tributary gullies following an intense convective downpour.",
    sourcePeakStageMeters: 6.5,
    minFlowSpeed: 1.2,
    maxFlowSpeed: 6.5,
    maxLateralDistanceMeters: 300.0,
    stageDecayPerMeter: 0.0006,
  },
  {
    id: "outburst",
    name: "Upstream release (e.g., glacial lake outburst)",
    badge: "GLOF / Dam Break Scenario",
    description:
      "Simulates an acute, high-stage discharge surge originating from an alpine headwater glacial moraine breach with downstream attenuation.",
    sourcePeakStageMeters: 14.0,
    minFlowSpeed: 1.8,
    maxFlowSpeed: 8.0,
    maxLateralDistanceMeters: 650.0,
    stageDecayPerMeter: 0.0003,
  },
];

export interface PointInspectionData {
  row: number;
  col: number;
  elevation: number;
  susceptibility?: CellSusceptibilityExplanation;
  arrivalTimeSeconds?: number;
  peakDepthMeters?: number;
  isFlooded: boolean;
}

export interface SimulationPanelProps {
  // Scenario Config State
  activePresetId: "rainfall" | "outburst" | "custom";
  onSelectPreset: (preset: ScenarioPreset) => void;
  peakStage: number;
  onPeakStageChange: (val: number) => void;
  flowSpeedMultiplier: number;
  onFlowSpeedMultiplierChange: (val: number) => void;
  lateralSpread: number;
  onLateralSpreadChange: (val: number) => void;

  // Source Selection
  isPickingSource: boolean;
  onTogglePickSource: () => void;
  sourceCell: [number, number] | null;

  // Actions
  onRunSimulation: () => void;
  onResetSimulation: () => void;
  isSimulating: boolean;

  // Live Readouts
  floodedAreaKm2: number;
  maxDepthMeters: number;
  currentFrontKm: number;
  simulatedTimeStr: string;

  // Selected Point Inspector Details
  pointData: PointInspectionData | null;
  onClearPoint: () => void;

  // Status & Visibility
  onClose?: () => void;
  className?: string;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  activePresetId,
  onSelectPreset,
  peakStage,
  onPeakStageChange,
  flowSpeedMultiplier,
  onFlowSpeedMultiplierChange,
  lateralSpread,
  onLateralSpreadChange,
  isPickingSource,
  onTogglePickSource,
  sourceCell,
  onRunSimulation,
  onResetSimulation,
  isSimulating,
  floodedAreaKm2,
  maxDepthMeters,
  currentFrontKm,
  simulatedTimeStr,
  pointData,
  onClearPoint,
  onClose,
  className = "",
}) => {
  const [accordionOpen, setAccordionOpen] = useState(false);

  return (
    <div
      className={`flex flex-col h-full bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 text-foreground overflow-y-auto ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-950/95 z-10">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-sm text-foreground">Flood Simulation Engine</h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Scenario Disclaimer Pill */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 uppercase tracking-wide text-[10px]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Illustrative Scenario Mode</span>
          </div>
          <p className="text-amber-200/80 leading-relaxed text-[11px]">
            Presets represent synthetic scenarios on sample terrain, not real-world weather events, predictions, or hydraulic forecasts.
          </p>
        </div>

        {/* 1. Scenario Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scenario Presets</span>
            </span>
            <span className="text-[10px] text-muted-foreground">Select to configure</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {SCENARIO_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className={`text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/40"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-semibold ${isSelected ? "text-cyan-300" : "text-foreground"}`}>
                      {preset.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Interactive Parameter Sliders */}
        <div className="space-y-3.5 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>Hydraulic Controls</span>
            </span>
            {activePresetId === "custom" && (
              <span className="text-[10px] font-mono text-cyan-400 font-bold">Customized</span>
            )}
          </div>

          {/* Peak Stage Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-numeric">
              <span className="text-muted-foreground">Source Peak Stage</span>
              <span className="font-semibold text-cyan-400">{peakStage.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={25.0}
              step={0.5}
              value={peakStage}
              onChange={(e) => onPeakStageChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Flow Velocity Multiplier Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-numeric">
              <span className="text-muted-foreground">Illustrative Speed Scaling</span>
              <span className="font-semibold text-cyan-400">{flowSpeedMultiplier.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={flowSpeedMultiplier}
              onChange={(e) => onFlowSpeedMultiplierChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Lateral Spread Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-numeric">
              <span className="text-muted-foreground">Max Lateral Spread Distance</span>
              <span className="font-semibold text-cyan-400">{lateralSpread.toFixed(0)} m</span>
            </div>
            <input
              type="range"
              min={100}
              max={1200}
              step={50}
              value={lateralSpread}
              onChange={(e) => onLateralSpreadChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Source Cell Picker Button */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">Discharge Source</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {sourceCell ? `Grid [${sourceCell[0]}, ${sourceCell[1]}]` : "Main channel origin (default)"}
              </span>
            </div>
            <button
              type="button"
              onClick={onTogglePickSource}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                isPickingSource
                  ? "bg-rose-500 text-white border-rose-400 animate-pulse"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{isPickingSource ? "Click Mesh..." : "Pick Source"}</span>
            </button>
          </div>

          {/* Run & Reset Buttons */}
          <div className="pt-2 grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={onRunSimulation}
              disabled={isSimulating}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5 text-xs font-semibold shadow-md"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isSimulating ? "Routing..." : "Run Replay"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onResetSimulation}
              className="w-full border-slate-700 hover:bg-slate-800 text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          </div>
        </div>

        {/* 3. Live Readouts */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span>Scenario Live Readouts</span>
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs font-numeric">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">Inundated Area</span>
              <span className="text-base font-bold text-cyan-300">
                {floodedAreaKm2 > 0 ? `${floodedAreaKm2.toFixed(2)} km²` : "0.00 km²"}
              </span>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">Max Inundation Depth</span>
              <span className="text-base font-bold text-emerald-400">
                {maxDepthMeters > 0 ? `${maxDepthMeters.toFixed(1)} m` : "0.0 m"}
              </span>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">Current Front Position</span>
              <span className="text-base font-bold text-rose-400">
                {currentFrontKm.toFixed(2)} km
              </span>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">Simulated Time</span>
              <span className="text-base font-bold text-amber-300 font-mono">
                {simulatedTimeStr}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Click-to-Inspect Point Details */}
        {pointData && (
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-cyan-500/40 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>Selected Terrain Point</span>
              </div>
              <button
                type="button"
                onClick={onClearPoint}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5 font-numeric text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grid Coordinate:</span>
                <span className="font-semibold">Row {pointData.row}, Col {pointData.col}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ground Elevation:</span>
                <span className="font-semibold text-foreground">{pointData.elevation.toFixed(1)} m</span>
              </div>
              {pointData.susceptibility && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <span className="text-muted-foreground">Susceptibility Tier:</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      pointData.susceptibility.classification === "Very High"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : pointData.susceptibility.classification === "High"
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        : pointData.susceptibility.classification === "Moderate"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    {pointData.susceptibility.classification} (Score: {pointData.susceptibility.score.toFixed(2)})
                  </span>
                </div>
              )}

              {/* Point Inundation Status */}
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-muted-foreground">Scenario Inundation:</span>
                <span className="font-semibold text-foreground">
                  {pointData.isFlooded ? "Flooded" : "Dry (Above Water Table)"}
                </span>
              </div>
              {pointData.isFlooded && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peak Inundation Depth:</span>
                    <span className="font-bold text-cyan-400">
                      {pointData.peakDepthMeters?.toFixed(2)} m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flood Arrival Time:</span>
                    <span className="font-mono text-amber-300">
                      T+ {Math.floor((pointData.arrivalTimeSeconds || 0) / 60)} min
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Factor Explainability Breakdown */}
            {pointData.susceptibility && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Susceptibility Factors
                </span>
                <div className="space-y-1">
                  {pointData.susceptibility.contributions.map((c) => (
                    <div key={c.factor} className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-300">{c.displayName}</span>
                        <span className="font-mono text-cyan-400">{c.contributionPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1">
                        <div
                          className="bg-cyan-400 h-1 rounded-full"
                          style={{ width: `${c.contributionPercentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. How this works & Limitations Accordion */}
        <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setAccordionOpen((prev) => !prev)}
            className="w-full p-3 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-between text-left font-semibold text-slate-300"
          >
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>How This Works & Limitations</span>
            </div>
            {accordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {accordionOpen && (
            <div className="p-3 bg-slate-950/70 border-t border-slate-800 space-y-3 text-[11px] text-slate-400 leading-relaxed">
              <div>
                <strong className="text-slate-200 block mb-1">Plain-Language Methodology:</strong>
                <ol className="list-decimal pl-4 space-y-1">
                  <li><strong>Pit Conditioning:</strong> Fills DEM depressions with a guard to ensure uninterrupted drainage.</li>
                  <li><strong>D8 Flow Routing:</strong> Identifies the primary channel along steepest descent vectors.</li>
                  <li><strong>Stage Hydrograph:</strong> Models illustrative wave rise and exponential attenuation downstream.</li>
                  <li><strong>HAND Lateral Inundation:</strong> Water ponds in adjacent cells where relative height above stream is less than stage.</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <strong className="text-amber-400 block mb-1">Key Limitations:</strong>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li>Not a calibrated 2D shallow-water numerical model (e.g. HEC-RAS or Delft3D).</li>
                  <li>Static stage decay without real dynamic momentum or backwater equations.</li>
                  <li>Constrained by DEM spatial resolution without precipitation or infiltration grids.</li>
                  <li>All velocities, wave speeds, and decay rates are illustrative defaults.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationPanel;
