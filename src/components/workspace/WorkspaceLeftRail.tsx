import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  Layers,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Sliders,
  Mountain,
  Droplets,
  ShieldAlert,
  Radio,
  ExternalLink,
} from "lucide-react";
import { StatusChip } from "@/components/shared/StatusChip";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { cn } from "@/lib/utils";

export interface LayerItem {
  id: string;
  name: string;
  group: "terrain" | "hydrology" | "hazard" | "observation";
  visible: boolean;
  opacity: number; // 0 to 100
  description: string;
  colorSwatch: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  status: "done" | "running" | "not_run";
  path?: string;
}

interface WorkspaceLeftRailProps {
  layers: LayerItem[];
  onToggleVisibility: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  activeLayerId: string;
  onSelectActiveLayer: (id: string) => void;
  className?: string;
}

export const INITIAL_LAYERS: LayerItem[] = [
  // Terrain
  {
    id: "dem",
    name: "DEM Elevation Hillshade",
    group: "terrain",
    visible: true,
    opacity: 80,
    description: "Shaded relief mesh representing morphological surface topography.",
    colorSwatch: "bg-slate-500",
  },
  {
    id: "slope",
    name: "Slope Gradient (°)",
    group: "terrain",
    visible: false,
    opacity: 75,
    description: "Topographic slope angle in degrees measured via 3x3 D8 neighbor gradient.",
    colorSwatch: "bg-amber-500",
  },
  {
    id: "aspect",
    name: "Aspect (Azimuth)",
    group: "terrain",
    visible: false,
    opacity: 70,
    description: "Downslope direction of maximum rate of elevation change.",
    colorSwatch: "bg-purple-500",
  },

  // Hydrology
  {
    id: "flow_acc",
    name: "D8 Flow Accumulation",
    group: "hydrology",
    visible: false,
    opacity: 80,
    description: "Upslope contributing catchment cell count directing overland surface runoff.",
    colorSwatch: "bg-blue-600",
  },
  {
    id: "streams",
    name: "Extracted Stream Channels",
    group: "hydrology",
    visible: false,
    opacity: 90,
    description: "Hydrological drainage network initiated at flow threshold (>100 cells).",
    colorSwatch: "bg-sky-400",
  },
  {
    id: "basins",
    name: "Sub-catchment Basins",
    group: "hydrology",
    visible: false,
    opacity: 60,
    description: "Delineated topographic catchment boundaries feeding major drainage outlets.",
    colorSwatch: "bg-teal-500",
  },
  {
    id: "hand",
    name: "HAND (Height Above Nearest Drainage)",
    group: "hydrology",
    visible: false,
    opacity: 75,
    description: "Relative vertical distance to the nearest hydrological stream channel.",
    colorSwatch: "bg-indigo-500",
  },
  {
    id: "twi",
    name: "Topographic Wetness Index (TWI)",
    group: "hydrology",
    visible: false,
    opacity: 80,
    description: "Steady-state moisture accumulation proxy calculated as ln(a / tan beta).",
    colorSwatch: "bg-cyan-500",
  },

  // Hazard
  {
    id: "susceptibility",
    name: "Flood Susceptibility Zone",
    group: "hazard",
    visible: true,
    opacity: 85,
    description: "Colourblind-safe 4-step susceptibility score (Low, Moderate, High, Very High).",
    colorSwatch: "bg-red-500",
  },

  // Observation
  {
    id: "sar_extent",
    name: "NISAR L-Band Observed Inundation",
    group: "observation",
    visible: false,
    opacity: 90,
    description: "Observed physical water extent derived from NISAR L-band SAR backscatter (< -18 dB).",
    colorSwatch: "bg-purple-700",
  },
];

export const WorkspaceLeftRail: React.FC<WorkspaceLeftRailProps> = ({
  layers,
  onToggleVisibility,
  onOpacityChange,
  activeLayerId,
  onSelectActiveLayer,
  className,
}) => {
  const { id } = useParams<{ id: string }>();
  const projectId = id || "demo-job";

  const workflowSteps: WorkflowStep[] = [
    { id: "terrain", name: "Terrain Conditioning", status: "done" },
    { id: "hydrology", name: "D8 Hydro Extraction", status: "done" },
    { id: "susceptibility", name: "Susceptibility Weighting", status: "done" },
    { id: "validation", name: "SAR Observation Validation", status: "done", path: `/project/${projectId}/validation` },
    { id: "advisories", name: "Rainfall Advisories", status: "done", path: `/project/${projectId}/advisories` },
  ];

  const layerGroups = [
    { key: "terrain", title: "Terrain Layers", icon: Mountain },
    { key: "hydrology", title: "Hydrology Layers", icon: Droplets },
    { key: "hazard", title: "Hazard Screening", icon: ShieldAlert },
    { key: "observation", title: "SAR Observation", icon: Radio },
  ] as const;

  return (
    <div className={cn("h-full w-full bg-card border-r border-border flex flex-col overflow-y-auto text-xs select-none", className)}>
      {/* 1. Workflow Steps Section */}
      <div className="p-4 border-b border-border space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span>Workflow Pipeline</span>
        </h3>

        <div className="space-y-1.5">
          {workflowSteps.map((step) => (
            <div
              key={step.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {step.status === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                <span className="font-medium text-foreground">{step.name}</span>
              </div>

              {step.path ? (
                <Link
                  to={step.path}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>View</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              ) : (
                <span className="text-[10px] font-numeric tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                  Done
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Grouped Layers List */}
      <div className="p-4 space-y-5 flex-1">
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5 text-primary" />
          <span>Layer Stack & Visibility</span>
        </h3>

        {layerGroups.map((group) => {
          const groupLayers = layers.filter((l) => l.group === group.key);
          if (groupLayers.length === 0) return null;

          return (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px] pb-1 border-b border-border/40">
                <group.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{group.title}</span>
              </div>

              <div className="space-y-2">
                {groupLayers.map((layer) => {
                  const isActive = activeLayerId === layer.id;

                  return (
                    <div
                      key={layer.id}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all space-y-2",
                        isActive
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/60 bg-background hover:bg-muted/30"
                      )}
                    >
                      {/* Top row: Swatch, Name, InfoTooltip, Visibility Toggle */}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectActiveLayer(layer.id)}
                          className="flex items-center gap-2 flex-1 text-left min-w-0"
                        >
                          <span className={cn("h-3 w-3 rounded-full shrink-0 border border-white/20", layer.colorSwatch)} />
                          <span
                            className={cn(
                              "font-semibold text-xs truncate",
                              isActive ? "text-primary font-bold" : "text-foreground"
                            )}
                          >
                            {layer.name}
                          </span>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <InfoTooltip content={layer.description} ariaLabel={`Meaning of ${layer.name}`} />
                          <button
                            type="button"
                            onClick={() => onToggleVisibility(layer.id)}
                            aria-label={layer.visible ? `Hide layer ${layer.name}` : `Show layer ${layer.name}`}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {layer.visible ? (
                              <Eye className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 opacity-50" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Opacity Slider */}
                      {layer.visible && (
                        <div className="flex items-center gap-2 pt-1 font-numeric tabular-nums">
                          <span className="text-[10px] text-muted-foreground w-10 shrink-0">Opacity</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={layer.opacity}
                            onChange={(e) => onOpacityChange(layer.id, Number(e.target.value))}
                            className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-[10px] text-muted-foreground font-mono w-7 text-right">
                            {layer.opacity}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
