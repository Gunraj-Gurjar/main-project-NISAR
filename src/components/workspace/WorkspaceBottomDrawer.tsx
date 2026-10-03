import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobDetailResponse } from "@/lib/api";
import { WhatIfPanel } from "./WhatIfPanel";
import { BarChart3, Database, Layers, Sliders, Activity, ChevronUp, ChevronDown, Table as TableIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

interface WorkspaceBottomDrawerProps {
  jobData: JobDetailResponse;
  onHoverClass?: (cls: "Low" | "Moderate" | "High" | "Very High" | null) => void;
  className?: string;
}

export const WorkspaceBottomDrawer: React.FC<WorkspaceBottomDrawerProps> = ({
  jobData,
  onHoverClass,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const metadata = jobData.metadata;
  const zones = jobData.explainable_breakdown?.zones || [
    { zone_label: "Very High", pixel_count: 500, area_percentage: 5, mean_susceptibility_score: 0.88 },
    { zone_label: "High", pixel_count: 1500, area_percentage: 15, mean_susceptibility_score: 0.65 },
    { zone_label: "Moderate", pixel_count: 3500, area_percentage: 35, mean_susceptibility_score: 0.42 },
    { zone_label: "Low", pixel_count: 4500, area_percentage: 45, mean_susceptibility_score: 0.18 },
  ];

  const zoneColors: Record<string, string> = {
    Low: "#fef08a",
    Moderate: "#f97316",
    High: "#ef4444",
    "Very High": "#6b21a8",
  };

  const histogramData = [
    { range: "0.0 - 0.1", count: 1200 },
    { range: "0.1 - 0.2", count: 2400 },
    { range: "0.2 - 0.3", count: 1900 },
    { range: "0.3 - 0.4", count: 1800 },
    { range: "0.4 - 0.5", count: 1200 },
    { range: "0.5 - 0.6", count: 850 },
    { range: "0.6 - 0.7", count: 420 },
    { range: "0.7 - 0.8", count: 180 },
    { range: "0.8 - 0.9", count: 90 },
    { range: "0.9 - 1.0", count: 35 },
  ];

  return (
    <div className={cn("w-full bg-card border-t border-border shadow-lg transition-all flex flex-col select-none", className)}>
      {/* Drawer Header Toggle Bar */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="h-9 px-4 bg-muted/40 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/60 transition-colors"
      >
        <div className="flex items-center gap-2 font-bold text-xs text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span>Analytics & Provenance Drawer</span>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? "Collapse Drawer" : "Expand Drawer"}
          className="p-1 rounded text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {/* Drawer Body */}
      {isExpanded && (
        <div className="p-4 max-h-72 overflow-y-auto flex-1">
          <Tabs defaultValue="area_class" className="w-full">
            <TabsList className="mb-3 h-8 bg-muted border border-border p-0.5 gap-1">
              <TabsTrigger value="stats" className="text-xs px-2.5 py-1">
                Stats & Percentiles
              </TabsTrigger>
              <TabsTrigger value="histogram" className="text-xs px-2.5 py-1">
                Score Histogram
              </TabsTrigger>
              <TabsTrigger value="area_class" className="text-xs px-2.5 py-1">
                Area per Class
              </TabsTrigger>
              <TabsTrigger value="sensitivity" className="text-xs px-2.5 py-1">
                Sensitivity & What-If
              </TabsTrigger>
              <TabsTrigger value="provenance" className="text-xs px-2.5 py-1">
                Job Log & Provenance
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Stats */}
            <TabsContent value="stats" className="space-y-3 font-numeric tabular-nums text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-sans uppercase">Min Elevation</span>
                  <p className="font-bold text-sm text-foreground">{metadata?.elevation_min || 0} m</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-sans uppercase">Max Elevation</span>
                  <p className="font-bold text-sm text-foreground">{metadata?.elevation_max || 1000} m</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-sans uppercase">Mean Elevation</span>
                  <p className="font-bold text-sm text-foreground">{metadata?.elevation_mean?.toFixed(1) || 450} m</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-sans uppercase">Slope P10 / P50</span>
                  <p className="font-bold text-sm text-foreground">1.2° / 5.8°</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-sans uppercase">Slope P90</span>
                  <p className="font-bold text-sm text-foreground">18.4°</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Histogram */}
            <TabsContent value="histogram" className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData}>
                  <XAxis dataKey="range" stroke="#888888" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                  <RechartsTooltip contentStyle={{ background: "#0f172a", borderRadius: "8px", border: "1px solid #334155", fontSize: "11px" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* TAB 3: Area per Class */}
            <TabsContent value="area_class" className="space-y-3 text-xs font-numeric tabular-nums">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-muted text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-2.5">Class</th>
                        <th className="p-2.5 text-right">Pixel Count</th>
                        <th className="p-2.5 text-right">% Area</th>
                        <th className="p-2.5 text-right">Mean Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {zones.map((z) => (
                        <tr
                          key={z.zone_label}
                          onMouseEnter={() => onHoverClass?.(z.zone_label as any)}
                          onMouseLeave={() => onHoverClass?.(null)}
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <td className="p-2.5 font-bold font-sans flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full inline-block"
                              style={{ backgroundColor: zoneColors[z.zone_label] }}
                            />
                            <span>{z.zone_label}</span>
                          </td>
                          <td className="p-2.5 text-right">{z.pixel_count}</td>
                          <td className="p-2.5 text-right font-bold text-foreground">{z.area_percentage.toFixed(1)}%</td>
                          <td className="p-2.5 text-right">{z.mean_susceptibility_score.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bar Chart Representation */}
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={zones}>
                      <XAxis dataKey="zone_label" stroke="#888888" fontSize={10} />
                      <YAxis stroke="#888888" fontSize={10} />
                      <RechartsTooltip contentStyle={{ background: "#0f172a", borderRadius: "8px", border: "1px solid #334155", fontSize: "11px" }} />
                      <Bar dataKey="area_percentage">
                        {zones.map((entry) => (
                          <Cell key={entry.zone_label} fill={zoneColors[entry.zone_label] || "hsl(var(--primary))"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Sensitivity & What-If */}
            <TabsContent value="sensitivity">
              <WhatIfPanel />
            </TabsContent>

            {/* TAB 5: Job Log & Provenance */}
            <TabsContent value="provenance" className="space-y-2 text-xs font-numeric tabular-nums">
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between border-b border-border/40 pb-1">
                  <span className="text-muted-foreground">Job ID:</span>
                  <span className="font-bold text-foreground">{jobData.job_id}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1">
                  <span className="text-muted-foreground">Created Timestamp:</span>
                  <span>{jobData.created_at}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1">
                  <span className="text-muted-foreground">Geoprocessing Status:</span>
                  <span className="text-emerald-500 font-bold">{jobData.status}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1">
                  <span className="text-muted-foreground">Calculated Output Layers:</span>
                  <span>{jobData.output_layers.join(", ")}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};
