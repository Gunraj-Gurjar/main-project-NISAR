import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import Plot from "react-plotly.js";
import { analyzeTerrrain } from "@/lib/terrain-analysis";
import AnalysisPanel, { type OverlayMode } from "@/components/AnalysisPanel";

interface TerrainViewerProps {
  elevationData: number[][];
  onBack: () => void;
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

const TerrainViewer = ({ elevationData, onBack }: TerrainViewerProps) => {
  const [exaggeration, setExaggeration] = useState(1.5);
  const [smoothing, setSmoothing] = useState(true);
  const [colorScale, setColorScale] = useState<string>("Earth");
  const [overlay, setOverlay] = useState<OverlayMode>("susceptibility");
  const [showContours, setShowContours] = useState(false);
  const plotRef = useRef<any>(null);

  const smoothedData = useMemo(() => {
    if (!smoothing) return elevationData;
    const rows = elevationData.length;
    const cols = elevationData[0].length;
    const smoothed: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let sum = 0, count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di, nj = j + dj;
            if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
              sum += elevationData[ni][nj];
              count++;
            }
          }
        }
        smoothed[i][j] = sum / count;
      }
    }
    return smoothed;
  }, [elevationData, smoothing]);

  const processedData = useMemo(() => {
    return smoothedData.map(row => row.map(v => v * exaggeration));
  }, [smoothedData, exaggeration]);

  const analysis = useMemo(() => analyzeTerrrain(smoothedData), [smoothedData]);

  // Get overlay surface data
  const overlayData = useMemo(() => {
    if (overlay === "none") return null;
    const map: Record<string, number[][] | null> = {
      susceptibility: analysis.floodSusceptibility,
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
      return analysis.classification.map(row => row.map(c => labelMap[c] ?? 0));
    }
    return map[overlay] ?? null;
  }, [overlay, analysis]);

  const activeColorScale = overlay !== "none" ? overlayColorScales[overlay] : colorScale;

  const surfaceColor = overlayData ?? undefined;

  const handleDownload = () => {
    const plotDiv = document.querySelector('.js-plotly-plot') as any;
    if (plotDiv) {
      import('plotly.js-dist-min').then((Plotly) => {
        Plotly.default.toImage(plotDiv, { format: 'png', width: 1920, height: 1080 }).then((url: string) => {
          const a = document.createElement('a');
          a.href = url;
          a.download = 'terrain_3d.png';
          a.click();
        });
      });
    }
  };

  const minElev = useMemo(() => {
    let min = Infinity;
    processedData.forEach(row => row.forEach(v => { if (v < min) min = v; }));
    return min;
  }, [processedData]);

  const maxElev = useMemo(() => {
    let max = -Infinity;
    processedData.forEach(row => row.forEach(v => { if (v > max) max = v; }));
    return max;
  }, [processedData]);

  const activeMin = useMemo(() => {
    const data = surfaceColor || processedData;
    let min = Infinity;
    data.forEach(row => row.forEach(v => { if (v < min) min = v; }));
    return min;
  }, [surfaceColor, processedData]);

  const activeMax = useMemo(() => {
    const data = surfaceColor || processedData;
    let max = -Infinity;
    data.forEach(row => row.forEach(v => { if (v > max) max = v; }));
    return max;
  }, [surfaceColor, processedData]);

  // Contour scatter traces
  const contourTraces = useMemo(() => {
    if (!showContours) return [];
    return analysis.contours.map((c) => ({
      type: "scatter3d" as const,
      mode: "markers" as const,
      x: c.points.map(p => p[1]),
      y: c.points.map(p => p[0]),
      z: c.points.map(() => c.level * exaggeration),
      marker: { size: 1, color: "rgba(255,255,255,0.4)" },
      showlegend: false,
      hoverinfo: "skip" as const,
    }));
  }, [showContours, analysis.contours, exaggeration]);

  const plotData: any[] = [
    {
      z: processedData,
      type: "surface",
      colorscale: activeColorScale,
      surfacecolor: surfaceColor,
      lighting: { ambient: 0.4, diffuse: 0.6, specular: 0.3, roughness: 0.5, fresnel: 0.2 },
      lightposition: { x: 1000, y: 1000, z: 3000 },
      contours: {
        z: { show: true, usecolormap: true, highlightcolor: "#ffffff", project: { z: false } },
      },
      colorbar: {
        title: { text: overlay === "none" ? "Elevation" : overlay.charAt(0).toUpperCase() + overlay.slice(1), font: { color: "#94a3b8" } },
        tickmode: "array",
        tickvals: [activeMin, activeMax],
        ticktext: [`Min: ${activeMin.toFixed(1)}`, `Max: ${activeMax.toFixed(1)}`],
        tickfont: { color: "#94a3b8", size: 12 },
        len: 0.5,
        thickness: 15,
        outlinewidth: 0,
        bgcolor: "rgba(0,0,0,0.5)",
      },
    },
    ...contourTraces,
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full min-h-0 flex flex-col relative overflow-hidden bg-slate-950 text-foreground"
    >
      {/* 3D Top Floating Action Bar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={handleDownload}
          className="bg-card/90 backdrop-blur px-3 py-1.5 rounded-lg border border-border text-xs font-medium flex items-center gap-1.5 hover:bg-card transition-all shadow-md"
        >
          <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export 3D PNG</span>
        </button>
      </div>

      {/* Main 3D Canvas Container */}
      <div className="w-full h-full flex-1 relative min-h-0 overflow-hidden flex items-center justify-center">
        {/* Floating Left Terrain Stats Box */}
        <div className="absolute top-3 left-3 z-10 bg-card/85 backdrop-blur-md p-3 rounded-xl border border-border/70 shadow-lg max-w-[200px] text-xs pointer-events-auto">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Terrain Mesh Stats</span>
          </div>
          <div className="space-y-1.5 font-numeric tabular-nums text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Grid:</span>
              <span className="font-semibold">{processedData.length} × {processedData[0]?.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Elev:</span>
              <span className="font-semibold text-emerald-400">{minElev.toFixed(0)}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Elev:</span>
              <span className="font-semibold text-purple-400">{maxElev.toFixed(0)}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mean Elev:</span>
              <span className="font-semibold text-cyan-400">{analysis.metrics.meanElevation.toFixed(0)}m</span>
            </div>
          </div>
        </div>

        {/* Plotly 3D Surface */}
        <Plot
          ref={plotRef}
          data={plotData}
          layout={{
            autosize: true,
            margin: { l: 0, r: 0, t: 0, b: 0 },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            scene: {
              bgcolor: "rgba(15, 23, 42, 0.5)",
              xaxis: { showgrid: false, showticklabels: false, title: "", zeroline: false, showline: false },
              yaxis: { showgrid: false, showticklabels: false, title: "", zeroline: false, showline: false },
              zaxis: {
                showgrid: true,
                gridcolor: "rgba(59,130,246,0.15)",
                showticklabels: true,
                title: "",
                tickfont: { color: "rgba(148,163,184,0.8)", size: 9 },
              },
              camera: { eye: { x: 1.3, y: 1.3, z: 0.8 } },
              aspectratio: { x: 1, y: 1, z: 0.35 },
            },
          }}
          config={{ displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ["toImage", "sendDataToCloud"] }}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </div>
    </motion.div>
  );
};

export default TerrainViewer;

