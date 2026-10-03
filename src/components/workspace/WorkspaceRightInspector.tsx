import React, { useState } from "react";
import { ExplainResponse } from "@/lib/api";
import { PanelHeader } from "@/components/shared/PanelHeader";
import { StatusChip } from "@/components/shared/StatusChip";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { BarChart3, Copy, Check, ShieldAlert, MapPin, Activity, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkspaceRightInspectorProps {
  explainData: ExplainResponse | null;
  loadingExplain: boolean;
  selectedLocation: { lat: number; lng: number } | null;
  className?: string;
}

export const WorkspaceRightInspector: React.FC<WorkspaceRightInspectorProps> = ({
  explainData,
  loadingExplain,
  selectedLocation,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    if (!explainData || !selectedLocation) return;
    const textToCopy = `Location (${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}): Classified as ${explainData.class} Susceptibility (Score: ${explainData.score.toFixed(2)}).\nSummary: ${explainData.summary}\nLimitations: ${explainData.limitations}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getClassBadgeStyle = (clsName: string) => {
    switch (clsName) {
      case "Very High":
        return "bg-susceptibility-veryHigh text-susceptibility-veryHigh-foreground";
      case "High":
        return "bg-susceptibility-high text-susceptibility-high-foreground";
      case "Moderate":
        return "bg-susceptibility-moderate text-susceptibility-moderate-foreground";
      case "Low":
        return "bg-susceptibility-low text-susceptibility-low-foreground";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  return (
    <div className={cn("h-full w-full bg-card border-l border-border flex flex-col p-4 overflow-y-auto space-y-5 text-xs select-none", className)}>
      <PanelHeader
        title="Location Inspector & Factor Explanation"
        subtitle="Detailed point explainability analysis"
        icon={BarChart3}
        badge={<StatusChip status="done" label="Explainable" />}
      />

      {loadingExplain ? (
        <div className="p-8 text-center space-y-3 my-auto">
          <Activity className="h-8 w-8 text-primary animate-pulse mx-auto" />
          <p className="font-semibold text-foreground">Fetching Geoprocessing Explanation...</p>
          <p className="text-muted-foreground text-[11px]">Evaluating D8 flow accumulation, slope concavity, and TWI factors.</p>
        </div>
      ) : explainData && selectedLocation ? (
        <div className="space-y-5">
          {/* Selected Coordinates Card */}
          <div className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between font-numeric tabular-nums">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <div>
                <span className="font-bold text-foreground">
                  {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lng.toFixed(4)}° E
                </span>
                <p className="text-[10px] text-muted-foreground font-sans">Point Inspector Coordinate</p>
              </div>
            </div>
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold font-sans shadow-xs", getClassBadgeStyle(explainData.class))}>
              {explainData.class} ({explainData.score.toFixed(2)})
            </span>
          </div>

          {/* Plain-English Explanation Summary */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>Generated Location Summary</span>
            </h4>
            <p className="text-muted-foreground leading-relaxed text-xs">
              {explainData.summary}
            </p>
          </div>

          {/* Per-Factor Bar Chart & Detail List */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Factor Breakdown & Contributions
            </h4>

            <div className="space-y-3 font-numeric tabular-nums">
              {explainData.contributions.map((c) => (
                <div key={c.factor} className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground font-sans">{c.factor}</span>
                    <span className="font-bold text-primary">{c.contribution_percentage}% Contribution</span>
                  </div>

                  {/* Contribution Progress Bar */}
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/40">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${c.contribution_percentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[11px] pt-1 text-muted-foreground border-t border-border/40">
                    <div>Raw: <strong className="text-foreground">{c.raw_value.toFixed(1)}</strong></div>
                    <div>Score: <strong className="text-foreground">{c.normalized_score.toFixed(2)}</strong></div>
                    <div>Weight: <strong className="text-foreground">{(c.weight * 100).toFixed(0)}%</strong></div>
                  </div>

                  <p className="text-[10px] text-muted-foreground font-sans leading-tight">
                    {c.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Scientific Limitations Guardrail Note */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Scientific Limitation:</span>
              <p>{explainData.limitations}</p>
            </div>
          </div>

          {/* Copy Location Summary Button */}
          <Button onClick={handleCopySummary} className="w-full gap-2 font-semibold text-xs shadow-xs">
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Copied to Clipboard!" : "Copy Location Summary"}</span>
          </Button>
        </div>
      ) : (
        /* Empty State before map click */
        <div className="my-auto p-6 rounded-xl border border-dashed border-border text-center space-y-3 bg-muted/20">
          <MapPin className="h-8 w-8 text-muted-foreground/60 mx-auto" />
          <h4 className="font-bold text-foreground text-sm">No Location Selected</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Click any pixel on the 2D map canvas to inspect exact multi-criteria factor contributions and plain-English summary.
          </p>
        </div>
      )}
    </div>
  );
};
