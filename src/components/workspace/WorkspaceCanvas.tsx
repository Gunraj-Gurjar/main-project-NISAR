import React, { useState, useMemo, lazy, Suspense, useRef, useEffect } from "react";
import { Layers, Mountain, Map as MapIcon, SlidersHorizontal, Crosshair, Radio, Eye, EyeOff, Building } from "lucide-react";
import { Map, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { LegendBar } from "@/components/shared/LegendBar";
import { SkeletonPanel } from "@/components/shared/SkeletonPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Lazy-load Plotly 3D terrain viewer
const TerrainViewer = lazy(() => import("@/components/TerrainViewer"));

interface WorkspaceCanvasProps {
  terrainData: number[][] | null;
  bounds: [number, number, number, number];
  viewMode: "2d" | "3d";
  onToggleViewMode: (mode: "2d" | "3d") => void;
  activeLayerName: string;
  onMapClick: (lat: number, lng: number) => void;
  hasValidationData?: boolean;
  highlightedClass?: string | null;
}

export const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  terrainData,
  bounds,
  viewMode,
  onToggleViewMode,
  activeLayerName,
  onMapClick,
  hasValidationData = true,
  highlightedClass,
}) => {
  const centerLongitude = (bounds[0] + bounds[2]) / 2;
  const centerLatitude = (bounds[1] + bounds[3]) / 2;

  // Coordinate readout state
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number; zoom: number; elev: number }>({
    lat: centerLatitude,
    lng: centerLongitude,
    zoom: 12,
    elev: 342.5,
  });

  // Controls State
  const [compareSwipeMode, setCompareSwipeMode] = useState(false);
  const [swipePos, setSwipePos] = useState(50); // percentage
  const [showLegend, setShowLegend] = useState(true);
  const [show3dBuildings, setShow3dBuildings] = useState(false);
  const [layerOpacity, setLayerOpacity] = useState(0.8);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate 2D raster Image Data URL from terrainData with Flood Heatmap Color Palette
  const rasterImageUrl = useMemo(() => {
    if (!terrainData || !terrainData.length || !terrainData[0].length) return null;
    const rows = terrainData.length;
    const cols = terrainData[0].length;

    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    let min = Infinity, max = -Infinity;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = terrainData[r][c];
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    const range = max - min || 1;

    const imgData = ctx.createImageData(cols, rows);
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const norm = (terrainData[r][c] - min) / range;
        let rCol = 6, gCol = 182, bCol = 212, alpha = 35; // Default low risk translucent cyan
        if (norm >= 0.70) {
          // Very High / Severe Flood Inundation Zone
          rCol = 225; gCol = 29; bCol = 72; alpha = 220; // Rose Crimson Red
        } else if (norm >= 0.50) {
          // High Flood Risk Sinks
          rCol = 249; gCol = 115; bCol = 22; alpha = 190; // Orange
        } else if (norm >= 0.30) {
          // Moderate Risk Pathways
          rCol = 245; gCol = 158; bCol = 11; alpha = 140; // Amber Yellow
        } else {
          // Low Susceptibility / Dry terrain
          rCol = 6; gCol = 182; bCol = 212; alpha = 35;
        }
        imgData.data[idx] = rCol;
        imgData.data[idx + 1] = gCol;
        imgData.data[idx + 2] = bCol;
        imgData.data[idx + 3] = alpha;
        idx += 4;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  }, [terrainData]);

  const handleMouseMove = (e: any) => {
    if (e.lngLat) {
      setCursorCoords((prev) => ({
        ...prev,
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      }));
    }
  };

  // MapLibre Image coordinates [top-left, top-right, bottom-right, bottom-left]
  const imageCoordinates: [[number, number], [number, number], [number, number], [number, number]] = [
    [bounds[0], bounds[3]],
    [bounds[2], bounds[3]],
    [bounds[2], bounds[1]],
    [bounds[0], bounds[1]],
  ];

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none flex flex-col">
      {/* Canvas Top Floating Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 flex-wrap">
        {/* 2D / 3D Mode Switcher */}
        <div className="flex items-center bg-card/90 backdrop-blur p-1 rounded-lg border border-border shadow-md">
          <button
            type="button"
            onClick={() => onToggleViewMode("2d")}
            aria-pressed={viewMode === "2d"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
              viewMode === "2d"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span>2D Map</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleViewMode("3d")}
            aria-pressed={viewMode === "3d"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
              viewMode === "3d"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Mountain className="h-3.5 w-3.5" />
            <span>3D Mesh</span>
          </button>
        </div>

        {/* Active Layer Label */}
        <div className="bg-card/90 backdrop-blur px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground shadow-md flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          <span>Active Layer: <strong className="text-cyan-400 font-bold">{activeLayerName}</strong></span>
        </div>
      </div>

      {/* Canvas Top Right Action */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 flex-wrap">
        {/* Opacity Control Slider */}
        <div className="bg-card/90 backdrop-blur px-3 py-1 rounded-lg border border-border text-xs flex items-center gap-2 shadow-md">
          <span className="text-[11px] text-muted-foreground font-semibold">Opacity:</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={layerOpacity}
            onChange={(e) => setLayerOpacity(Number(e.target.value))}
            className="w-16 accent-primary cursor-pointer"
            title="Adjust Flood Layer Opacity"
          />
          <span className="text-[11px] font-mono text-foreground font-bold">{Math.round(layerOpacity * 100)}%</span>
        </div>

        <Button
          variant={show3dBuildings ? "default" : "outline"}
          size="sm"
          onClick={() => setShow3dBuildings((prev) => !prev)}
          className="h-8 text-xs gap-1.5 bg-card/90 backdrop-blur border-border shadow-md"
        >
          <Building className="h-3.5 w-3.5" />
          <span>{show3dBuildings ? "3D Buildings: ON" : "3D Buildings: OFF"}</span>
        </Button>

        <Button
          variant={compareSwipeMode ? "default" : "outline"}
          size="sm"
          disabled={!hasValidationData}
          onClick={() => setCompareSwipeMode((prev) => !prev)}
          className="h-8 text-xs gap-1.5 bg-card/90 backdrop-blur border-border shadow-md"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{compareSwipeMode ? "Disable Compare" : "Compare (Susceptibility vs SAR)"}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLegend((prev) => !prev)}
          className="h-8 text-xs gap-1.5 bg-card/90 backdrop-blur border-border shadow-md"
        >
          {showLegend ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span>{showLegend ? "Hide Legend" : "Show Legend"}</span>
        </Button>
      </div>

      {/* Main Render Area */}
      <div className="w-full flex-1 relative min-h-0 overflow-hidden">
        {viewMode === "3d" ? (
          <div className="w-full h-full relative">
            {terrainData ? (
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <SkeletonPanel height="h-64" rows={3} className="w-full max-w-md" />
                  </div>
                }
              >
                <TerrainViewer elevationData={terrainData} onBack={() => {}} />
              </Suspense>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-numeric tabular-nums">
                Generating 3D terrain mesh...
              </div>
            )}
          </div>
        ) : (
          /* 2D MapLibre Canvas with Map-Projected Flood Overlay */
          <div className="w-full h-full relative bg-slate-950 flex items-center justify-center">
            {/* Top Center Flood Inundation Quick Banner */}
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-cyan-500/30 text-white text-xs font-medium shadow-xl flex items-center gap-2 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>🌊 <strong>Flood Hazard Heatmap</strong></span>
              <span className="text-slate-400 text-[11px] hidden sm:inline">• Red/Orange = Severe Inundation Sinks</span>
            </div>

            <Map
              initialViewState={{
                longitude: centerLongitude,
                latitude: centerLatitude,
                zoom: 12,
              }}
              style={{ width: "100%", height: "100%" }}
              mapStyle={{
                version: 8,
                sources: {
                  "osm-tiles": {
                    type: "raster",
                    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                    tileSize: 256,
                    attribution: "&copy; OpenStreetMap contributors",
                  },
                },
                layers: [
                  {
                    id: "osm-tiles-layer",
                    type: "raster",
                    source: "osm-tiles",
                    minzoom: 0,
                    maxzoom: 19,
                  },
                ],
              }}
              onMouseMove={handleMouseMove}
              onClick={(e) => onMapClick(e.lngLat.lat, e.lngLat.lng)}
            >
              {rasterImageUrl && (
                <Source id="tif-terrain-source" type="image" url={rasterImageUrl} coordinates={imageCoordinates}>
                  <Layer
                    id="tif-terrain-layer"
                    type="raster"
                    paint={{
                      "raster-opacity": layerOpacity,
                      "raster-fade-duration": 0,
                    }}
                  />
                </Source>
              )}
            </Map>


            {/* Compare / Swipe Split Screen Overlay */}
            {compareSwipeMode && (
              <div className="absolute inset-0 z-10 pointer-events-none flex">
                <div
                  className="h-full border-r-2 border-primary bg-primary/10 transition-all relative overflow-hidden"
                  style={{ width: `${swipePos}%` }}
                >
                  <div className="absolute top-14 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    Susceptibility Screening
                  </div>
                </div>
                <div className="flex-1 h-full bg-purple-900/10 relative overflow-hidden">
                  <div className="absolute top-14 right-4 bg-purple-700 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                    <Radio className="h-3 w-3" />
                    <span>NISAR SAR Extent</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={swipePos}
                  onChange={(e) => setSwipePos(Number(e.target.value))}
                  className="absolute inset-x-0 bottom-16 z-20 w-full accent-primary pointer-events-auto cursor-ew-resize px-8"
                />
              </div>
            )}

            {/* Class Highlight Banner */}
            {highlightedClass && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
                Highlighting Zone: {highlightedClass} Susceptibility
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Legend (Positioned safely above coordinate bar) */}
      {showLegend && (
        <div className="absolute bottom-12 right-4 z-20 max-w-sm w-auto bg-card/95 backdrop-blur p-2.5 rounded-xl border border-border shadow-xl">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 gap-2">
            <span>Legend: {activeLayerName}</span>
            <button
              onClick={() => setShowLegend(false)}
              className="text-muted-foreground hover:text-foreground text-xs px-1 font-bold"
              title="Close Legend"
            >
              ✕
            </button>
          </div>
          <LegendBar compact={true} activeZone={highlightedClass} />
        </div>
      )}

      {/* Bottom Floating Bar: Scale & Coordinate Readout */}
      <div className="h-8 bg-card/95 border-t border-border px-4 flex items-center justify-between text-xs text-muted-foreground font-numeric tabular-nums z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Crosshair className="h-3.5 w-3.5 text-primary" />
            <span>
              Lat: <strong>{cursorCoords.lat.toFixed(4)}° N</strong> • Lon: <strong>{cursorCoords.lng.toFixed(4)}° E</strong>
            </span>
          </div>
          <span>Elev: <strong>{cursorCoords.elev.toFixed(1)} m</strong></span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-12 h-1 bg-foreground rounded-full inline-block" />
            <span>1 km</span>
          </div>
          <span>Zoom: {cursorCoords.zoom}</span>
        </div>
      </div>
    </div>
  );
};

