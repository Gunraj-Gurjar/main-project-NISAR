import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { ProjectNavHeader } from "@/components/layout/ProjectNavHeader";
import { useProject } from "@/context/ProjectContext";
import { PanelHeader } from "@/components/shared/PanelHeader";
import { StatusChip } from "@/components/shared/StatusChip";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import {
  CloudRain,
  ShieldAlert,
  Droplets,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Layers,
  MapPin,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdvisoryItem {
  id: string;
  region: string;
  severity: "yellow" | "orange" | "red";
  trigger: string;
  rainfallValue: string;
  rainfallSource: string;
  topFactors: { factor: string; contribution: number }[];
  recommendedAction: string;
  timestamp: string;
  dataSources: string;
  limitations: string;
  coords: [number, number];
}

export const AdvisoriesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeProject, getProjectById } = useProject();

  const project = (id ? getProjectById(id) : null) || activeProject;

  // Historical Replay Series State (24h, 48h, 72h)
  const [replayHours, setReplayHours] = useState<number>(24);
  const [isPlayingReplay, setIsPlayingReplay] = useState<boolean>(false);

  // Expanded Advisory Card State
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    adv_1: true,
    adv_2: false,
  });

  const toggleExpand = (cardId: string) => {
    setExpandedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const advisories: AdvisoryItem[] = [
    {
      id: "adv_1",
      region: "Coastal Lowland Sector Alpha",
      severity: "orange",
      trigger: "IMD Very Heavy Rainfall Scenario (115.6 - 204.4 mm/day)",
      rainfallValue: "142.5 mm / 24h",
      rainfallSource: "IMD Automated Weather Station / GPM IMERG",
      topFactors: [
        { factor: "Relative Elevation", contribution: 38 },
        { factor: "Slope Flatness (<3°)", contribution: 32 },
        { factor: "Curvature Concavity", contribution: 18 },
      ],
      recommendedAction: "Preliminary terrain screening indicates high ponding predisposition in morphological lowlands. Recommend field inspection of local drainage culverts.",
      timestamp: new Date().toISOString(),
      dataSources: "Copernicus DEM 30m, IMD Rainfall Grids, D8 Hydro-Geoprocessing",
      limitations: "Static terrain morphological screening. Does not predict real-time flood timing or hydrodynamic inundation depth.",
      coords: [37.7749, -122.4194],
    },
    {
      id: "adv_2",
      region: "Central Basin Confluence Zone",
      severity: "yellow",
      trigger: "IMD Heavy Rainfall Scenario (64.5 - 115.5 mm/day)",
      rainfallValue: "88.0 mm / 24h",
      rainfallSource: "IMD Synoptic Station Network",
      topFactors: [
        { factor: "Topographic Wetness Index", contribution: 42 },
        { factor: "Relative Elevation", contribution: 30 },
      ],
      recommendedAction: "Moderate screening predisposition in secondary catchment channels. Monitor low-capacity drainage culverts.",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      dataSources: "Copernicus DEM 30m, D8 Flow Accumulation",
      limitations: "Terrain predisposition screening only. Does not model urban storm sewer capacity.",
      coords: [37.7849, -122.4094],
    },
  ];

  const getSeverityBadge = (sev: "yellow" | "orange" | "red") => {
    switch (sev) {
      case "red":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-xs">Severe Advisory (Red)</span>;
      case "orange":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-xs">High Advisory (Orange)</span>;
      case "yellow":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-950 shadow-xs">Moderate Advisory (Yellow)</span>;
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col">
      <ProjectNavHeader />

      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-12 w-full space-y-6 flex-1">
        {/* Top Header & Replay Control */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <PanelHeader
            title="Rainfall-Aware Screening Advisories"
            subtitle="Combines static terrain predisposition with rainfall intensity scenarios"
            icon={CloudRain}
            badge={<StatusChip status="warning" label="Advisories Active" />}
          />

          {/* Historical Replay Slider with Explicit Label */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Historical Precipitation Replay Series:</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-bold font-mono border border-amber-500/30">
                  Illustrative, uncalibrated
                </span>
              </div>
              <span className="text-xs font-numeric tabular-nums font-bold text-primary">
                Accumulation Window: {replayHours} hours
              </span>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min={24}
                max={72}
                step={24}
                value={replayHours}
                onChange={(e) => setReplayHours(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-lg"
              />
              <div className="flex items-center gap-2 text-xs font-numeric tabular-nums shrink-0">
                <span className={replayHours === 24 ? "font-bold text-primary" : "text-muted-foreground"}>24h</span>
                <span className={replayHours === 48 ? "font-bold text-primary" : "text-muted-foreground"}>48h</span>
                <span className={replayHours === 72 ? "font-bold text-primary" : "text-muted-foreground"}>72h</span>
              </div>
            </div>
          </div>
        </div>

        {/* List of Advisory Cards */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Active Screening Advisory Bulletins ({advisories.length})
          </h3>

          {advisories.map((adv) => {
            const isExpanded = expandedCards[adv.id];

            return (
              <div
                key={adv.id}
                className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all space-y-0"
              >
                {/* Mandatory Disclaimer Box inside EVERY Card */}
                <div className="bg-amber-500/15 border-b border-amber-500/20 px-4 py-2 text-amber-900 dark:text-amber-200 text-[11px] font-medium flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Advisory: terrain-based screening. Not an official warning. Consult IMD, CWC, NDMA or your State Disaster Management Authority.</span>
                  </div>
                </div>

                {/* Card Header */}
                <div
                  onClick={() => toggleExpand(adv.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <h4 className="font-bold text-base text-foreground">{adv.region}</h4>
                      {getSeverityBadge(adv.severity)}
                    </div>
                    <p className="text-xs text-muted-foreground font-numeric tabular-nums">
                      Trigger: {adv.trigger} • Measured: {adv.rainfallValue}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label={isExpanded ? "Collapse card details" : "Expand card details"}
                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>

                {/* Expandable Card Body */}
                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-border space-y-4 text-xs font-numeric tabular-nums">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                      <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                        <span className="text-[10px] text-muted-foreground font-sans uppercase block">Precipitation Value & Source</span>
                        <p className="font-bold text-foreground">{adv.rainfallValue}</p>
                        <p className="text-[11px] text-muted-foreground font-sans">{adv.rainfallSource}</p>
                      </div>

                      <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                        <span className="text-[10px] text-muted-foreground font-sans uppercase block">Top Contributing Terrain Factors</span>
                        <div className="flex flex-wrap gap-2 pt-1 font-sans">
                          {adv.topFactors.map((tf) => (
                            <span key={tf.factor} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-semibold">
                              {tf.factor}: {tf.contribution}%
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Generic Recommended Action */}
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
                      <span className="font-bold text-foreground font-sans block">Generic Recommended Action:</span>
                      <p className="text-muted-foreground font-sans text-xs leading-relaxed">
                        {adv.recommendedAction}
                      </p>
                    </div>

                    {/* Footer Metadata */}
                    <div className="text-[11px] text-muted-foreground font-sans space-y-1 pt-2 border-t border-border">
                      <p>Data Sources: {adv.dataSources}</p>
                      <p>Limitations: {adv.limitations}</p>
                      <p className="font-mono">Timestamp: {adv.timestamp}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
