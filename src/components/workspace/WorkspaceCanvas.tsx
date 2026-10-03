import React, { useState, lazy, Suspense } from "react";
import { Layers, Mountain, Map as MapIcon, SlidersHorizontal, Crosshair, Radio, Info } from "lucide-react";
import { Map } from "react-map-gl/maplibre";
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

  // Swipe Comparison Mode State
  const [compareSwipeMode, setCompareSwipeMode] = useState(false);
  const [swipePos, setSwipePos] = useState(50); // percentage

  const handleMouseMove = (e: any) => {
    if (e.lngLat) {
      setCursorCoords((prev) => ({
        ...prev,
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      }));
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden select-none flex flex-col">
      {/* Canvas Top Floating Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
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
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span>Active Layer: <strong className="text-primary">{activeLayerName}</strong></span>
        </div>
      </div>

      {/* Canvas Top Right Action: Compare / Swipe Mode (Enabled when validation data exists) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
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
      </div>

      {/* Main Render Area: 2D Map vs 3D Terrain */}
      <div className="w-full flex-1 relative">
        {viewMode === "3d" ? (
          <div className="w-full h-full relative">
            <div className="absolute top-14 left-3 z-10 bg-amber-500/10 border border-amber-500/20 backdrop-blur text-amber-900 dark:text-amber-200 text-[11px] p-2 rounded-lg max-w-sm flex items-start gap-1.5">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>3D view renders elevation mesh with active layer color draping overlay mode.</span>
            </div>
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
          /* 2D MapLibre Canvas */
          <div className="w-full h-full relative">
            <Map
              initialViewState={{
                longitude: centerLongitude,
                latitude: centerLatitude,
                zoom: 12,
              }}
              style={{ width: "100%", height: "100%" }}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/json"
              onMouseMove={handleMouseMove}
              onClick={(e) => onMapClick(e.lngLat.lat, e.lngLat.lng)}
            />

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

                {/* Interactive Swipe Handle */}
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

            {/* Class Highlight Banner when hovering Bottom Drawer class */}
            {highlightedClass && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
                Highlighting Zone: {highlightedClass} Susceptibility
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Legend */}
      <div className="absolute bottom-10 right-4 z-20 max-w-sm w-full bg-card/90 backdrop-blur p-3 rounded-xl border border-border shadow-lg">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Legend: {activeLayerName}
        </div>
        <LegendBar compact={true} activeZone={highlightedClass} />
      </div>

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
