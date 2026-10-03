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
      transition={{ duration: 0.5 }}
      className="relative z-10 min-h-screen flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <button
          onClick={onBack}
          className="glass-card px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:neon-glow-blue transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h2 className="text-lg font-semibold gradient-text hidden sm:block">Terrain Hazard Screening & Factor Explorer</h2>
        <button
          onClick={handleDownload}
          className="glass-card px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:neon-glow-purple transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export PNG
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Stats Panel - Improvised */}
        <motion.aside
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full lg:w-72 p-4 border-b lg:border-b-0 lg:border-r border-border/50"
        >
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden group border-white/5 hover:border-white/10 transition-colors shadow-2xl">
            {/* Background glowing effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-cyan opacity-70"></div>
            <div className="absolute -inset-24 bg-gradient-to-br from-neon-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl z-0 pointer-events-none"></div>

            <div className="relative z-10">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <svg className="w-4 h-4 text-neon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Terrain Stats
              </h3>
              
              <div className="space-y-5">
                <div className="bg-background/40 backdrop-blur-md rounded-xl p-3 border border-white/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Grid Size</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5">{processedData.length} × {processedData[0]?.length}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-neon-cyan/10 flex items-center justify-center text-neon-cyan">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background/40 backdrop-blur-md rounded-xl p-3 border border-white/5 flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Min Elev</span>
                    <span className="text-lg font-bold text-neon-green">{minElev.toFixed(0)}<span className="text-xs text-muted-foreground ml-0.5">m</span></span>
                  </div>
                  <div className="bg-background/40 backdrop-blur-md rounded-xl p-3 border border-white/5 flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Max Elev</span>
                    <span className="text-lg font-bold text-neon-purple">{maxElev.toFixed(0)}<span className="text-xs text-muted-foreground ml-0.5">m</span></span>
                  </div>
                </div>

                <div className="bg-background/40 backdrop-blur-md rounded-xl p-3 border border-white/5 space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Mean Elevation</span>
                    <span className="text-sm font-bold text-neon-cyan">{analysis.metrics.meanElevation.toFixed(0)}m</span>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-neon-cyan h-full rounded-full" style={{ width: `${(analysis.metrics.meanElevation - minElev) / (maxElev - minElev) * 100}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-background/40 backdrop-blur-md rounded-xl p-3 border border-white/5 flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Deviation</span>
                  <span className="text-xs font-mono font-medium text-foreground/80 bg-black/30 px-2 py-1 rounded-md border border-white/5">± {analysis.metrics.stdElevation.toFixed(0)}m</span>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* 3D Plot */}
        <div className="flex-1 relative">
          <Plot
            ref={plotRef}
            data={plotData}
            layout={{
              autosize: true,
              margin: { l: 0, r: 0, t: 0, b: 0 },
              paper_bgcolor: "rgba(0,0,0,0)",
              scene: {
                bgcolor: "rgba(0,0,0,0)",
                xaxis: { showgrid: false, showticklabels: false, title: "", zeroline: false, showline: false },
                yaxis: { showgrid: false, showticklabels: false, title: "", zeroline: false, showline: false },
                zaxis: {
                  showgrid: true, gridcolor: "rgba(59,130,246,0.1)",
                  showticklabels: true, title: "",
                  tickfont: { color: "rgba(148,163,184,0.6)", size: 10 },
                },
                camera: { eye: { x: 1.5, y: 1.5, z: 1.0 } },
                aspectratio: { x: 1, y: 1, z: 0.5 },
              },
            }}
            config={{ displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ["toImage", "sendDataToCloud"] }}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </div>

        {/* Right Analysis Panel */}
        <AnalysisPanel
          analysis={analysis}
          overlay={overlay}
          onOverlayChange={setOverlay}
          showContours={showContours}
          onContoursChange={setShowContours}
        />
      </div>
    </motion.div>
  );
};

export default TerrainViewer;
