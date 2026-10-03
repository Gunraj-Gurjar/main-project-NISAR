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
    description: "Well-drained / steep slopes or non-accumulating terrain",
  },
  {
    label: "Moderate",
    range: "0.30 - 0.50",
    description: "Moderate slopes or transitional drainage pathways",
  },
  {
    label: "High",
    range: "0.50 - 0.70",
    description: "Flat or concave terrain prone to flow concentration",
  },
  {
    label: "Very High",
    range: "0.70 - 1.00",
    description: "Morphological depressions, floodplains & closed sinks",
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
        return "bg-susceptibility-low text-susceptibility-low-foreground border-yellow-500/40";
      case "Moderate":
        return "bg-susceptibility-moderate text-susceptibility-moderate-foreground border-orange-600/40";
      case "High":
        return "bg-susceptibility-high text-susceptibility-high-foreground border-red-600/40";
      case "Very High":
        return "bg-susceptibility-veryHigh text-susceptibility-veryHigh-foreground border-purple-900/40";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className={cn("space-y-2", className)} aria-label="Flood Susceptibility Zone Legend">
      {/* Visual Bar */}
      <div className="flex h-3 w-full rounded-md overflow-hidden border border-border shadow-inner">
        <div
          className="bg-susceptibility-low h-full"
          style={{ width: percentages ? `${percentages.Low}%` : "25%" }}
          title="Low Susceptibility (0.00 - 0.30)"
        />
        <div
          className="bg-susceptibility-moderate h-full"
          style={{ width: percentages ? `${percentages.Moderate}%` : "25%" }}
          title="Moderate Susceptibility (0.30 - 0.50)"
        />
        <div
          className="bg-susceptibility-high h-full"
          style={{ width: percentages ? `${percentages.High}%` : "25%" }}
          title="High Susceptibility (0.50 - 0.70)"
        />
        <div
          className="bg-susceptibility-veryHigh h-full"
          style={{ width: percentages ? `${percentages["Very High"]}%` : "25%" }}
          title="Very High Susceptibility (0.70 - 1.00)"
        />
      </div>

      {/* Grid of legend items */}
      <div className={cn("grid gap-2", compact ? "grid-cols-2 md:grid-cols-4 text-xs" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4")}>
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
                isSelected ? "ring-2 ring-primary scale-[1.02]" : "hover:opacity-90",
                !onZoneClick && "cursor-default"
              )}
            >
              <div className="flex items-center justify-between font-semibold">
                <span>{zone.label}</span>
                {pct !== undefined && (
                  <span className="font-numeric tabular-nums font-bold text-xs">{pct.toFixed(1)}%</span>
                )}
              </div>
              <div className="text-[10px] opacity-80 font-numeric tabular-nums mt-0.5">
                Score: {zone.range}
              </div>
              {!compact && (
                <div className="text-[11px] opacity-90 mt-1 line-clamp-2">
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
