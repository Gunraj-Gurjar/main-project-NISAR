import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Plot from "react-plotly.js";
import { Play, Pause, RotateCcw, Repeat, Camera, Sliders, Eye, EyeOff, ShieldCheck, Waves, PanelRightClose, PanelRightOpen } from "lucide-react";
import { analyzeTerrrain } from "@/lib/terrain-analysis";
import type { OverlayMode } from "@/components/AnalysisPanel";
import { runFloodSimulation } from "@/lib/flood-sim/engine.ts";
import { computeTerrainSusceptibility } from "@/lib/flood-sim/susceptibility.ts";
import type { SimulationResult, SparseDepthStep } from "@/lib/flood-sim/types.ts";
import type { TerrainSusceptibilityResult } from "@/lib/flood-sim/susceptibility-types.ts";
import SimulationPanel, { SCENARIO_PRESETS, type ScenarioPreset, type PointInspectionData } from "@/components/workspace/SimulationPanel.tsx";

interface TerrainViewerProps {
  elevationData: number[][];
  onBack: () => void;
  cellSizeMeters?: number;
}

const colorScales = ["Earth", "Viridis", "Hot", "Greens", "Portland", "Jet"];

const overlayColorScales: Record<OverlayMode, string> = {
  none: "Earth",
  susceptibility: "Blues",
  slope: "YlOrRd",
  aspect: "HSV",
  curvature: "RdBu",
  wetness: "Viridis",
  classification: "Portland",
  instability: "YlOrRd",
  roughness: "Inferno",
};

// Colorblind-safe 4-class discrete colorscale for "flood susceptibility (terrain-based)"
// Low: Pale Blue/Gray (#e0f3f8), Moderate: Warm Yellow (#fee090), High: Amber/Orange (#f46d43), Very High: Dark Red/Crimson (#a50026)
const COLORBLIND_SAFE_SUSCEPTIBILITY_SCALE: [number, string][] = [
  [0.0, "#e0f3f8"],
  [0.349, "#e0f3f8"],
  [0.35, "#fee090"],
  [0.599, "#fee090"],
  [0.60, "#f46d43"],
  [0.799, "#f46d43"],
  [0.80, "#a50026"],
  [1.0, "#a50026"],
];

const TerrainViewer: React.FC<TerrainViewerProps> = ({
  elevationData,
  onBack,
  cellSizeMeters = 30.0,
}) => {
  // Terrain Mesh Controls
  const [exaggeration, setExaggeration] = useState(1.5);
  const [smoothing, setSmoothing] = useState(true);
  const [colorScale, setColorScale] = useState<string>("Earth");
  const [overlay, setOverlay] = useState<OverlayMode>("susceptibility");
  const [showContours, setShowContours] = useState(false);
  const [useColorblindSafe, setUseColorblindSafe] = useState(true);

  // Simulation Controls & State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.5x to 4x
  const [isLooping, setIsLooping] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showWater, setShowWater] = useState(true);

  // Simulation Panel & Scenario Presets State
  const [showSimPanel, setShowSimPanel] = useState(true);
  const [activePresetId, setActivePresetId] = useState<"rainfall" | "outburst" | "custom">("rainfall");
  const [peakStage, setPeakStage] = useState(6.5);
  const [flowSpeedMultiplier, setFlowSpeedMultiplier] = useState(1.0);
  const [lateralSpread, setLateralSpread] = useState(300.0);
  const [sourceCell, setSourceCell] = useState<[number, number] | null>(null);
  const [isPickingSource, setIsPickingSource] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<PointInspectionData | null>(null);

  const plotRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // 1. Sanitization & Decimation for smooth rendering (max vertices cap ~250k)
  const { sanitizedGrid, rows, cols, effectiveDx } = useMemo(() => {
    const rawRows = elevationData.length;
    const rawCols = elevationData[0]?.length || 0;
    if (!rawRows || !rawCols) {
      return { sanitizedGrid: [], rows: 0, cols: 0, effectiveDx: cellSizeMeters };
    }

    // Vertex budget check: max 200x200 (40k vertices) for ultra-fluid 60FPS Plotly updates
    const maxDim = 150;
    const step = Math.max(1, Math.ceil(Math.max(rawRows, rawCols) / maxDim));

    const outRows = Math.ceil(rawRows / step);
    const outCols = Math.ceil(rawCols / step);
    const grid: number[][] = [];

    // Filter valid elevation to replace non-finite/NaN and extreme spikes
    let validSum = 0;
    let validCount = 0;
    for (let r = 0; r < rawRows; r += step) {
      for (let c = 0; c < rawCols; c += step) {
        const v = elevationData[r][c];
        if (Number.isFinite(v) && v > -500 && v < 9000) {
          validSum += v;
          validCount++;
        }
      }
    }
    const meanValid = validCount ? validSum / validCount : 500;

    for (let r = 0; r < rawRows; r += step) {
      const row: number[] = [];
      for (let c = 0; c < rawCols; c += step) {
        let v = elevationData[r][c];
        if (!Number.isFinite(v) || v <= -500 || v > 9000) {
          v = meanValid; // Clean nodata/spike guard
        }
        row.push(v);
      }
      grid.push(row);
    }

    return {
      sanitizedGrid: grid,
      rows: grid.length,
      cols: grid[0]?.length || 0,
      effectiveDx: cellSizeMeters * step,
    };
  }, [elevationData, cellSizeMeters]);

  // 2. Physical X / Y Metres vectors (proper orientation: X West->East, Y South->North)
  const xMetres = useMemo(() => {
    return Array.from({ length: cols }, (_, c) => c * effectiveDx);
  }, [cols, effectiveDx]);

  const yMetres = useMemo(() => {
    // Array row 0 is top (North). For standard Cartesian axes where Y increases Northwards:
    return Array.from({ length: rows }, (_, r) => (rows - 1 - r) * effectiveDx);
  }, [rows, effectiveDx]);

  // 3. Smoothed & Exaggerated Elevation Matrix
  const smoothedData = useMemo(() => {
    if (!smoothing || !rows || !cols) return sanitizedGrid;
    const smoothed: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let sum = 0, count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di, nj = j + dj;
            if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
              sum += sanitizedGrid[ni][nj];
              count++;
            }
          }
        }
        smoothed[i][j] = sum / count;
      }
    }
    return smoothed;
  }, [sanitizedGrid, smoothing, rows, cols]);

  const processedData = useMemo(() => {
    return smoothedData.map((row) => row.map((v) => v * exaggeration));
  }, [smoothedData, exaggeration]);

  // Flattened Float32Array for pure simulation engine
  const demFloat32 = useMemo(() => {
    const arr = new Float32Array(rows * cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr[r * cols + c] = smoothedData[r][c];
      }
    }
    return arr;
  }, [smoothedData, rows, cols]);

  // 4. Run Pure Hydrological Simulation Engine
  const simResult: SimulationResult | null = useMemo(() => {
    if (!rows || !cols) return null;
    try {
      return runFloodSimulation(demFloat32, rows, cols, {
        cellSizeMeters: effectiveDx,
        accumulationThreshold: Math.max(10, Math.floor((rows * cols) * 0.002)),
        maxPitFillDepth: 100.0,
        sourcePeakStageMeters: peakStage,
        stageDecayPerMeter: 0.0004,
        minFlowSpeed: 0.8 * flowSpeedMultiplier,
        maxFlowSpeed: 6.0 * flowSpeedMultiplier,
        maxLateralDistanceMeters: lateralSpread,
        hydrographRiseSeconds: 1200,
        hydrographRecessionSeconds: 3600,
        timeStepSeconds: 120, // 2-min steps for smooth replay
        totalDurationSeconds: 7200, // 2 hours
        customSourceCell: sourceCell || undefined,
      });
    } catch (e) {
      console.error("Simulation engine failed:", e);
      return null;
    }
  }, [demFloat32, rows, cols, effectiveDx, peakStage, flowSpeedMultiplier, lateralSpread, sourceCell]);

  // 5. Compute Static "flood susceptibility (terrain-based)" Layer
  const susceptibilityResult: TerrainSusceptibilityResult | null = useMemo(() => {
    if (!simResult) return null;
    try {
      return computeTerrainSusceptibility(
        demFloat32,
        simResult.handGrid,
        simResult.flowAccumulationGrid,
        rows,
        cols,
        effectiveDx
      );
    } catch (e) {
      console.error("Susceptibility calculation failed:", e);
      return null;
    }
  }, [demFloat32, simResult, rows, cols, effectiveDx]);

  // Legacy morphological analysis for other overlays
  const analysis = useMemo(() => {
    if (!smoothedData.length) return null;
    return analyzeTerrrain(smoothedData);
  }, [smoothedData]);

  // 6. Surface coloring logic
  const surfaceColor = useMemo(() => {
    if (overlay === "none" || !analysis) return undefined;
    if (overlay === "susceptibility") {
      if (useColorblindSafe && susceptibilityResult) {
        // Convert 1D float scores to 2D row-major array
        const grid: number[][] = [];
        for (let r = 0; r < rows; r++) {
          const row: number[] = [];
          for (let c = 0; c < cols; c++) {
            row.push(susceptibilityResult.scores[r * cols + c]);
          }
          grid.push(row);
        }
        return grid;
      }
      return analysis.floodSusceptibility;
    }
    const map: Record<string, number[][] | null> = {
      slope: analysis.slope,
      aspect: analysis.aspect,
      curvature: analysis.factorLayers.curvatureConcavity,
      wetness: analysis.factorLayers.wetnessIndex,
      instability: analysis.slopeInstability,
      roughness: analysis.roughness,
      classification: null,
    };
    if (overlay === "classification") {
      const labelMap: Record<string, number> = { plain: 0, hill: 1, mountain: 2, valley: 3 };
      return analysis.classification.map((row) => row.map((c) => labelMap[c] ?? 0));
    }
    return map[overlay] ?? undefined;
  }, [overlay, analysis, useColorblindSafe, susceptibilityResult, rows, cols]);

  const activeColorScale = useMemo(() => {
    if (overlay === "susceptibility" && useColorblindSafe) {
      return COLORBLIND_SAFE_SUSCEPTIBILITY_SCALE;
    }
    return overlay !== "none" ? overlayColorScales[overlay] : colorScale;
  }, [overlay, useColorblindSafe, colorScale]);

  // 7. Water Layer Surface Generation for currentStepIdx
  // z = terrain + depth where flooded, NaN elsewhere
  const waterZGrid = useMemo(() => {
    if (!simResult || !showWater) return null;
    const step = simResult.steps[currentStepIdx];
    if (!step) return null;

    const zWater: (number | null)[][] = Array.from({ length: rows }, () =>
      new Array(cols).fill(null)
    );

    for (let i = 0; i < step.cellIndices.length; i++) {
      const idx = step.cellIndices[i];
      const depth = step.depths[i];
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        // Exaggerated water surface to match terrain exaggeration
        zWater[r][c] = (smoothedData[r][c] + depth) * exaggeration;
      }
    }

    return zWater;
  }, [simResult, showWater, currentStepIdx, rows, cols, smoothedData, exaggeration]);

  // 8. Flood Route & Current Flood Front Marker
  const routeData = useMemo(() => {
    if (!simResult || !simResult.route.length || !showRoute) return null;
    const currentSimTime = simResult.timeStepsSeconds[currentStepIdx] || 0;

    const routeX: number[] = [];
    const routeY: number[] = [];
    const routeZ: number[] = [];

    let frontCell: { x: number; y: number; z: number } | null = null;

    for (let i = 0; i < simResult.route.length; i++) {
      const cell = simResult.route[i];
      const x = cell.col * effectiveDx;
      const y = (rows - 1 - cell.row) * effectiveDx;
      // Offset 2m above terrain so line does not z-fight with mesh
      const z = (smoothedData[cell.row][cell.col] + 2.5) * exaggeration;

      routeX.push(x);
      routeY.push(y);
      routeZ.push(z);

      if (cell.arrivalTimeSeconds <= currentSimTime) {
        frontCell = { x, y, z };
      }
    }

    return { routeX, routeY, routeZ, frontCell };
  }, [simResult, showRoute, currentStepIdx, effectiveDx, rows, smoothedData, exaggeration]);

  // 9. Playback loop
  const totalSteps = simResult?.steps.length || 0;
  const currentSimTime = simResult?.timeStepsSeconds[currentStepIdx] || 0;

  useEffect(() => {
    if (!isPlaying || !totalSteps) return;

    let timerId: any = null;
    const baseIntervalMs = 200; // 5 FPS base rate
    const stepInterval = Math.max(25, baseIntervalMs / playbackSpeed);

    timerId = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev + 1 >= totalSteps) {
          if (isLooping) return 0;
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, stepInterval);

    return () => clearInterval(timerId);
  }, [isPlaying, totalSteps, playbackSpeed, isLooping]);

  // Fast Plotly updates using restyle for water trace when playing
  useEffect(() => {
    const plotEl = plotRef.current?.el;
    if (plotEl && plotEl._fullData && plotEl._fullData.length > 1 && waterZGrid) {
      import("plotly.js-dist-min").then((Plotly) => {
        try {
          // Trace index 1 is water surface, trace 3 is flood front marker
          const restyleData: any = { z: [waterZGrid] };
          Plotly.default.restyle(plotEl, restyleData, [1]);

          if (routeData?.frontCell) {
            Plotly.default.restyle(
              plotEl,
              {
                x: [[routeData.frontCell.x]],
                y: [[routeData.frontCell.y]],
                z: [[routeData.frontCell.z]],
              },
              [3]
            );
          }
        } catch (e) {
          // Fallback handled by React state
        }
      });
    }
  }, [waterZGrid, routeData]);

  // 10. Camera Presets
  const setCameraPreset = useCallback(
    (preset: "oblique" | "topDown" | "followFront") => {
      const plotEl = plotRef.current?.el;
      if (!plotEl) return;

      import("plotly.js-dist-min").then((Plotly) => {
        let camera: any = { eye: { x: 1.3, y: 1.3, z: 0.8 } };

        if (preset === "topDown") {
          camera = { eye: { x: 0.0, y: 0.0, z: 2.2 }, up: { x: 0, y: 1, z: 0 } };
        } else if (preset === "oblique") {
          camera = { eye: { x: 1.2, y: -1.4, z: 0.75 }, center: { x: 0, y: 0, z: -0.1 } };
        } else if (preset === "followFront" && routeData?.frontCell) {
          // Normalize coordinates to [-0.5, 0.5]
          const normX = (routeData.frontCell.x / (cols * effectiveDx)) - 0.5;
          const normY = (routeData.frontCell.y / (rows * effectiveDx)) - 0.5;
          camera = {
            center: { x: normX, y: normY, z: 0 },
            eye: { x: normX + 0.6, y: normY - 0.6, z: 0.5 },
          };
        }

        Plotly.default.relayout(plotEl, { "scene.camera": camera });
      });
    },
    [routeData, cols, rows, effectiveDx]
  );

  // Time formatting: "T+ hh:mm"
  const formattedSimTime = useMemo(() => {
    const totalMinutes = Math.floor(currentSimTime / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `T+ ${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }, [currentSimTime]);

  // Live Readouts Calculations for current time step
  const liveMetrics = useMemo(() => {
    if (!simResult) {
      return { floodedAreaKm2: 0, maxDepthMeters: 0, currentFrontKm: 0 };
    }

    const step = simResult.steps[currentStepIdx];
    const cellAreaKm2 = (effectiveDx * effectiveDx) / 1_000_000;
    const floodedAreaKm2 = step ? step.cellIndices.length * cellAreaKm2 : 0;

    let maxDepthMeters = 0;
    if (step && step.depths.length) {
      for (let i = 0; i < step.depths.length; i++) {
        if (step.depths[i] > maxDepthMeters) maxDepthMeters = step.depths[i];
      }
    }

    let currentFrontKm = 0;
    for (const cell of simResult.route) {
      if (cell.arrivalTimeSeconds <= currentSimTime) {
        currentFrontKm = cell.distanceFromSourceMeters / 1000;
      }
    }

    return { floodedAreaKm2, maxDepthMeters, currentFrontKm };
  }, [simResult, currentStepIdx, currentSimTime, effectiveDx]);

  // Plotly Click Handler: Click on terrain to inspect or pick source
  const handlePlotClick = useCallback(
    (event: any) => {
      const point = event?.points?.[0];
      if (!point) return;

      // Extract clicked grid coordinates from physical metres (x: col * dx, y: (rows - 1 - r) * dx)
      const xVal = point.x;
      const yVal = point.y;
      if (typeof xVal !== "number" || typeof yVal !== "number") return;

      const c = Math.max(0, Math.min(cols - 1, Math.round(xVal / effectiveDx)));
      const r = Math.max(0, Math.min(rows - 1, Math.round(rows - 1 - yVal / effectiveDx)));

      // If user is currently picking a discharge source
      if (isPickingSource) {
        setSourceCell([r, c]);
        setIsPickingSource(false);
        setActivePresetId("custom");
        return;
      }

      // Point inspection: susceptibility, arrival time, peak depth
      const elevation = smoothedData[r]?.[c] || 0;
      const cellIdx = r * cols + c;

      const susceptibility = susceptibilityResult?.explainCell(r, c);
      const peakDepth = simResult?.peakDepthGrid[cellIdx];
      const arrivalTime = simResult?.arrivalTimeGrid[cellIdx];
      const isFlooded = peakDepth !== undefined && !isNaN(peakDepth) && peakDepth > 0.01;

      setSelectedPoint({
        row: r,
        col: c,
        elevation,
        susceptibility,
        arrivalTimeSeconds: arrivalTime,
        peakDepthMeters: isFlooded ? peakDepth : undefined,
        isFlooded,
      });
      setShowSimPanel(true);
    },
    [isPickingSource, cols, rows, effectiveDx, smoothedData, susceptibilityResult, simResult]
  );

  // Preset switch handler
  const handleSelectPreset = useCallback((preset: ScenarioPreset) => {
    setActivePresetId(preset.id);
    setPeakStage(preset.sourcePeakStageMeters);
    setFlowSpeedMultiplier(1.0);
    setLateralSpread(preset.maxLateralDistanceMeters);
    setSourceCell(null);
    setCurrentStepIdx(0);
  }, []);

  // Assemble Plotly traces
  const plotData: any[] = useMemo(() => {
    if (!processedData.length) return [];

    // Trace 0: Terrain Surface
    const terrainTrace: any = {
      name: "Terrain",
      type: "surface",
      x: xMetres,
      y: yMetres,
      z: processedData,
      colorscale: activeColorScale,
      surfacecolor: surfaceColor,
      lighting: { ambient: 0.45, diffuse: 0.65, specular: 0.25, roughness: 0.6, fresnel: 0.2 },
      lightposition: { x: 50000, y: 50000, z: 20000 },
      colorbar: {
        title: {
          text:
            overlay === "susceptibility"
              ? "Susceptibility"
              : overlay === "none"
              ? "Elevation (m)"
              : overlay.charAt(0).toUpperCase() + overlay.slice(1),
          font: { color: "#94a3b8", size: 11 },
        },
        tickfont: { color: "#94a3b8", size: 10 },
        len: 0.45,
        thickness: 14,
        bgcolor: "rgba(15,23,42,0.7)",
      },
      showscale: true,
    };

    // Trace 1: Water Layer Surface
    const waterTrace: any = {
      name: "Water Depth",
      type: "surface",
      x: xMetres,
      y: yMetres,
      z: waterZGrid || [[null]],
      opacity: 0.72,
      colorscale: [
        [0.0, "rgba(56, 189, 248, 0.75)"],
        [1.0, "rgba(2, 132, 199, 0.95)"],
      ],
      showscale: false,
      hoverinfo: "skip",
      lighting: { ambient: 0.8, diffuse: 0.3, specular: 0.9, roughness: 0.1 },
    };

    // Trace 2: Flood Route Polyline
    const routeTrace: any = {
      name: "Flood Channel Route",
      type: "scatter3d",
      mode: "lines",
      x: routeData?.routeX || [],
      y: routeData?.routeY || [],
      z: routeData?.routeZ || [],
      line: {
        color: "#22d3ee",
        width: 4,
      },
      hoverinfo: "name",
      showlegend: false,
    };

    // Trace 3: Moving Flood Front Marker
    const frontTrace: any = {
      name: "Flood Front",
      type: "scatter3d",
      mode: "markers",
      x: routeData?.frontCell ? [routeData.frontCell.x] : [],
      y: routeData?.frontCell ? [routeData.frontCell.y] : [],
      z: routeData?.frontCell ? [routeData.frontCell.z] : [],
      marker: {
        size: 7,
        color: "#f43f5e",
        symbol: "diamond",
      },
      hoverinfo: "name",
      showlegend: false,
    };

    return [terrainTrace, waterTrace, routeTrace, frontTrace];
  }, [
    processedData,
    xMetres,
    yMetres,
    activeColorScale,
    surfaceColor,
    overlay,
    waterZGrid,
    routeData,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full min-h-0 flex flex-col relative overflow-hidden bg-slate-950 text-foreground"
    >
      {/* 1. Mandatory Persistent Guardrail Label */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[calc(100vw-450px)] hidden md:block">
        <div className="bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-amber-500/50 text-amber-300 text-xs font-medium shadow-xl flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="truncate">Illustrative simulation on sample terrain. Not a real event or a prediction.</span>
        </div>
      </div>

      {/* 2. Top-Right Action Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 flex-nowrap">
        {/* Camera Presets */}
        <div className="bg-card/90 backdrop-blur p-1 rounded-lg border border-border shadow-md flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCameraPreset("oblique")}
            className="px-2 py-1 text-[11px] font-medium rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
            title="Oblique valley view"
          >
            <Camera className="w-3 h-3 text-cyan-400" />
            <span>Oblique</span>
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset("topDown")}
            className="px-2 py-1 text-[11px] font-medium rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            title="Top-down orthographic view"
          >
            <span>Top-Down</span>
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset("followFront")}
            className="px-2 py-1 text-[11px] font-medium rounded hover:bg-muted text-rose-400 hover:text-rose-300 transition-all"
            title="Focus camera on flood wave front"
          >
            <span>Follow Front</span>
          </button>
        </div>

        {/* Colorblind Toggle */}
        <button
          type="button"
          onClick={() => setUseColorblindSafe((prev) => !prev)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all shadow-md shrink-0 ${
            useColorblindSafe
              ? "bg-primary/20 border-primary text-primary"
              : "bg-card/90 border-border text-muted-foreground hover:text-foreground"
          }`}
          title="Toggle Colorblind-safe 4-class palette"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>CB Safe</span>
        </button>

        {/* Water Layer Toggle */}
        <button
          type="button"
          onClick={() => setShowWater((prev) => !prev)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all shadow-md shrink-0 ${
            showWater
              ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
              : "bg-card/90 border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Water</span>
        </button>

        {/* Simulation Panel Toggle */}
        <button
          type="button"
          onClick={() => setShowSimPanel((prev) => !prev)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all shadow-md shrink-0 ${
            showSimPanel
              ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold"
              : "bg-card/90 border-border text-muted-foreground hover:text-foreground"
          }`}
          title="Toggle Simulation Control & Inspector Panel"
        >
          {showSimPanel ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          <span>Sim Controls</span>
        </button>

        {/* Export 3D Screenshot with Embedded Guardrail Annotation */}
        <button
          type="button"
          onClick={() => {
            const plotDiv = document.querySelector(".js-plotly-plot") as any;
            if (plotDiv) {
              import("plotly.js-dist-min").then((Plotly) => {
                Plotly.default
                  .toImage(plotDiv, {
                    format: "png",
                    width: 1920,
                    height: 1080,
                  })
                  .then((url: string) => {
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "flood_sim_terrain_3d.png";
                    a.click();
                  });
              });
            }
          }}
          className="bg-card/90 backdrop-blur px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium flex items-center gap-1.5 hover:bg-card transition-all shadow-md shrink-0"
          title="Export high-res screenshot with persistent guardrail disclaimer"
        >
          <span>Export 3D</span>
        </button>
      </div>

      {/* 3. Main 3D Canvas & Simulation Panel Container */}
      <div className="w-full h-full flex-1 relative min-h-0 overflow-hidden flex flex-row">
        {/* Plotly Canvas Container */}
        <div className="flex-1 h-full relative min-h-0 overflow-hidden flex items-center justify-center">
          {/* Floating Left Terrain Stats Box */}
          <div className="absolute top-14 left-3 z-10 bg-card/85 backdrop-blur-md p-3 rounded-xl border border-border/70 shadow-lg max-w-[210px] text-xs pointer-events-auto">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>Terrain Mesh & Exagg</span>
              </span>
              <span className="font-mono text-cyan-400 font-bold">{exaggeration.toFixed(1)}x</span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Vertical Exaggeration</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={exaggeration}
                  onChange={(e) => setExaggeration(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="pt-1.5 border-t border-border/50 space-y-1 font-numeric tabular-nums text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grid Resolution:</span>
                  <span className="font-semibold">{rows} × {cols}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cell Size:</span>
                  <span className="font-semibold">{effectiveDx.toFixed(0)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extent (X × Y):</span>
                  <span className="font-semibold text-emerald-400">
                    {((cols * effectiveDx) / 1000).toFixed(1)}km × {((rows * effectiveDx) / 1000).toFixed(1)}km
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Plotly Surface */}
          <Plot
            ref={plotRef}
            data={plotData}
            onClick={handlePlotClick}
            layout={{
              autosize: true,
              margin: { l: 0, r: 0, t: 0, b: 0 },
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(0,0,0,0)",
              scene: {
                bgcolor: "rgba(15, 23, 42, 0.6)",
                xaxis: {
                  showgrid: true,
                  gridcolor: "rgba(148,163,184,0.1)",
                  title: "Distance X (m)",
                  titlefont: { size: 10, color: "#64748b" },
                  tickfont: { size: 8, color: "#64748b" },
                },
                yaxis: {
                  showgrid: true,
                  gridcolor: "rgba(148,163,184,0.1)",
                  title: "Distance Y (m)",
                  titlefont: { size: 10, color: "#64748b" },
                  tickfont: { size: 8, color: "#64748b" },
                },
                zaxis: {
                  showgrid: true,
                  gridcolor: "rgba(59,130,246,0.15)",
                  title: "Elevation (m)",
                  titlefont: { size: 10, color: "#64748b" },
                  tickfont: { size: 8, color: "#64748b" },
                },
                camera: { eye: { x: 1.3, y: -1.3, z: 0.85 } },
                aspectratio: { x: 1, y: 1, z: 0.35 },
              },
              annotations: [
                {
                  text: "Illustrative simulation on sample terrain. Not a real event or a prediction.",
                  showarrow: false,
                  xref: "paper",
                  yref: "paper",
                  x: 0.5,
                  y: 0.02,
                  xanchor: "center",
                  yanchor: "bottom",
                  font: {
                    size: 11,
                    color: "#f59e0b",
                  },
                  bgcolor: "rgba(15, 23, 42, 0.85)",
                  bordercolor: "rgba(245, 158, 11, 0.4)",
                  borderwidth: 1,
                  borderpad: 6,
                },
              ],
            }}
            config={{
              displayModeBar: true,
              displaylogo: false,
              modeBarButtonsToRemove: ["toImage", "sendDataToCloud"],
            }}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />

          {/* Bottom Simulation Time Controller Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-2xl bg-card/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-border shadow-2xl flex flex-col gap-2 pointer-events-auto">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Flood Inundation Timeline</span>
                <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md">
                  {formattedSimTime}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  (Frame {currentStepIdx + 1}/{totalSteps || 1})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLooping((prev) => !prev)}
                  className={`p-1 rounded text-xs transition-colors ${
                    isLooping ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Toggle loop"
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[10px] font-mono">
                  {[0.5, 1.0, 2.0, 4.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPlaybackSpeed(s)}
                      className={`px-1.5 py-0.5 rounded ${
                        playbackSpeed === s
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline Scrubber */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying((prev) => !prev)}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
                title={isPlaying ? "Pause simulation" : "Play simulation"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIdx(0);
                }}
                className="w-7 h-7 rounded-full bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                title="Reset to beginning"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min={0}
                max={Math.max(0, totalSteps - 1)}
                value={currentStepIdx}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentStepIdx(Number(e.target.value));
                }}
                className="flex-1 accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Right Collapsible Simulation & Point Inspector Panel */}
        {showSimPanel && (
          <div className="w-80 md:w-96 h-full z-10 border-l border-slate-800 shrink-0">
            <SimulationPanel
              activePresetId={activePresetId}
              onSelectPreset={handleSelectPreset}
              peakStage={peakStage}
              onPeakStageChange={(v) => {
                setActivePresetId("custom");
                setPeakStage(v);
              }}
              flowSpeedMultiplier={flowSpeedMultiplier}
              onFlowSpeedMultiplierChange={(v) => {
                setActivePresetId("custom");
                setFlowSpeedMultiplier(v);
              }}
              lateralSpread={lateralSpread}
              onLateralSpreadChange={(v) => {
                setActivePresetId("custom");
                setLateralSpread(v);
              }}
              isPickingSource={isPickingSource}
              onTogglePickSource={() => setIsPickingSource((prev) => !prev)}
              sourceCell={sourceCell}
              onRunSimulation={() => {
                setIsSimulating(true);
                setCurrentStepIdx(0);
                setIsPlaying(true);
                setTimeout(() => setIsSimulating(false), 200);
              }}
              onResetSimulation={() => {
                setIsPlaying(false);
                setCurrentStepIdx(0);
                setSourceCell(null);
              }}
              isSimulating={isSimulating}
              floodedAreaKm2={liveMetrics.floodedAreaKm2}
              maxDepthMeters={liveMetrics.maxDepthMeters}
              currentFrontKm={liveMetrics.currentFrontKm}
              simulatedTimeStr={formattedSimTime}
              pointData={selectedPoint}
              onClearPoint={() => setSelectedPoint(null)}
              onClose={() => setShowSimPanel(false)}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TerrainViewer;
