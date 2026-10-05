import React from "react";
import { cn } from "@/lib/utils";

export interface SusceptibilityZone {
  label: "Low" | "Moderate" | "High" | "Very High";
  range: string;
  percentage?: number;
  description: string;
}

export const SUSCEPTIBILITY_ZONES: SusceptibilityZone[] = [
  {
    label: "Low",
    range: "0.00 - 0.30",
    description: "Safe / Well-drained high terrain",
  },
  {
    label: "Moderate",
    range: "0.30 - 0.50",
    description: "Transitional slope & drainage pathway",
  },
  {
    label: "High",
    range: "0.50 - 0.70",
    description: "Lowland depression prone to flow accumulation",
  },
  {
    label: "Very High",
    range: "0.70 - 1.00",
    description: "Severe flood inundation zone & natural sink",
  },
];

interface LegendBarProps {
  percentages?: Record<"Low" | "Moderate" | "High" | "Very High", number>;
  activeZone?: string | null;
  onZoneClick?: (zone: "Low" | "Moderate" | "High" | "Very High") => void;
  className?: string;
  compact?: boolean;
}

export const LegendBar: React.FC<LegendBarProps> = ({
  percentages,
  activeZone,
  onZoneClick,
  className,
  compact = false,
}) => {
  const getZoneStyle = (label: string) => {
    switch (label) {
      case "Low":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/40";
      case "Moderate":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/40";
      case "High":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/40";
      case "Very High":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/40";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className={cn("space-y-2.5", className)} aria-label="Flood Susceptibility Zone Legend">
      {/* Visual Color Gradient Bar */}
      <div className="flex h-3.5 w-full rounded-lg overflow-hidden border border-border/80 shadow-inner">
        <div
          className="bg-cyan-500 h-full transition-all"
          style={{ width: percentages ? `${percentages.Low}%` : "25%" }}
          title="Low Flood Risk (0.00 - 0.30)"
        />
        <div
          className="bg-amber-500 h-full transition-all"
          style={{ width: percentages ? `${percentages.Moderate}%` : "25%" }}
          title="Moderate Flood Risk (0.30 - 0.50)"
        />
        <div
          className="bg-orange-500 h-full transition-all"
          style={{ width: percentages ? `${percentages.High}%` : "25%" }}
          title="High Flood Risk (0.50 - 0.70)"
        />
        <div
          className="bg-rose-600 h-full transition-all"
          style={{ width: percentages ? `${percentages["Very High"]}%` : "25%" }}
          title="Very High Inundation Zone (0.70 - 1.00)"
        />
      </div>

      {/* Grid of legend items */}
      <div className={cn("grid gap-2", compact ? "grid-cols-2 text-xs" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4")}>
        {SUSCEPTIBILITY_ZONES.map((zone) => {
          const isSelected = activeZone === zone.label;
          const pct = percentages ? percentages[zone.label] : undefined;

          return (
            <button
              key={zone.label}
              type="button"
              onClick={() => onZoneClick?.(zone.label)}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col p-2 rounded-lg border text-left transition-all focus-visible:ring-2 focus-visible:ring-ring",
                getZoneStyle(zone.label),
                isSelected ? "ring-2 ring-primary scale-[1.02] shadow-sm" : "hover:opacity-95",
                !onZoneClick && "cursor-default"
              )}
            >
              <div className="flex items-center justify-between font-bold text-xs leading-none">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full inline-block shrink-0",
                      zone.label === "Low" && "bg-cyan-500",
                      zone.label === "Moderate" && "bg-amber-500",
                      zone.label === "High" && "bg-orange-500",
                      zone.label === "Very High" && "bg-rose-600"
                    )}
                  />
                  {zone.label}
                </span>
                {pct !== undefined && (
                  <span className="font-numeric tabular-nums font-bold text-[11px]">{pct.toFixed(1)}%</span>
                )}
              </div>
              <div className="text-[10px] opacity-90 font-numeric tabular-nums mt-1 font-semibold">
                Score: {zone.range}
              </div>
              {!compact && (
                <div className="text-[11px] opacity-90 mt-1 line-clamp-2 leading-tight">
                  {zone.description}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
