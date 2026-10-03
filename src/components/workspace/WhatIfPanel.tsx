import React, { useState } from "react";
import { Sliders, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Button } from "@/components/ui/button";

interface WhatIfWeights {
  relativeElevation: number;
  slopeFlatness: number;
  curvatureConcavity: number;
  wetnessIndex: number;
}

interface WhatIfPanelProps {
  onWeightsChanged?: (newPctMap: Record<"Low" | "Moderate" | "High" | "Very High", number>) => void;
}

export const WhatIfPanel: React.FC<WhatIfPanelProps> = () => {
  const [weights, setWeights] = useState<WhatIfWeights>({
    relativeElevation: 0.35,
    slopeFlatness: 0.30,
    curvatureConcavity: 0.20,
    wetnessIndex: 0.15,
  });

  // Calculate recomputed zone percentages dynamically
  const total = weights.relativeElevation + weights.slopeFlatness + weights.curvatureConcavity + weights.wetnessIndex;
  const normElev = weights.relativeElevation / (total || 1);
  const normSlope = weights.slopeFlatness / (total || 1);

  const recomputedVeryHigh = (normElev * 15 + normSlope * 5).toFixed(1);
  const recomputedHigh = (normElev * 25 + normSlope * 15).toFixed(1);
  const recomputedModerate = (normElev * 30 + normSlope * 40).toFixed(1);
  const recomputedLow = (100 - Number(recomputedVeryHigh) - Number(recomputedHigh) - Number(recomputedModerate)).toFixed(1);

  const handleReset = () => {
    setWeights({
      relativeElevation: 0.35,
      slopeFlatness: 0.30,
      curvatureConcavity: 0.20,
      wetnessIndex: 0.15,
    });
  };

  return (
    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4 text-xs font-numeric tabular-nums">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-foreground text-sm font-sans">Interactive What-If Factor Sensitivity</h4>
        </div>
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-bold tracking-wide uppercase font-sans border border-amber-500/30">
          Exploratory, not calibrated
        </span>
      </div>

      <p className="text-muted-foreground font-sans text-xs leading-relaxed">
        Perturb factor weights in real time to simulate sensitivity on susceptibility zone area distribution.
      </p>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <div className="flex justify-between font-semibold text-foreground font-sans">
            <span>Relative Elevation</span>
            <span className="text-primary font-bold">{(weights.relativeElevation * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={weights.relativeElevation}
            onChange={(e) => setWeights({ ...weights, relativeElevation: Number(e.target.value) })}
            className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between font-semibold text-foreground font-sans">
            <span>Slope Flatness</span>
            <span className="text-primary font-bold">{(weights.slopeFlatness * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={weights.slopeFlatness}
            onChange={(e) => setWeights({ ...weights, slopeFlatness: Number(e.target.value) })}
            className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between font-semibold text-foreground font-sans">
            <span>Curvature Concavity</span>
            <span className="text-primary font-bold">{(weights.curvatureConcavity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={weights.curvatureConcavity}
            onChange={(e) => setWeights({ ...weights, curvatureConcavity: Number(e.target.value) })}
            className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between font-semibold text-foreground font-sans">
            <span>Topographic Wetness Index</span>
            <span className="text-primary font-bold">{(weights.wetnessIndex * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={weights.wetnessIndex}
            onChange={(e) => setWeights({ ...weights, wetnessIndex: Number(e.target.value) })}
            className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
          />
        </div>
      </div>

      {/* Simulated Recomputed Class Output */}
      <div className="p-3 rounded-lg border border-border bg-card space-y-2">
        <div className="flex justify-between items-center text-xs font-sans font-semibold text-foreground">
          <span>Recomputed Area Distribution:</span>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-6 px-2 text-[10px] gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>Reset Weights</span>
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-1.5 rounded bg-purple-500/15 border border-purple-500/30">
            <span className="text-[10px] font-sans block text-muted-foreground">Very High</span>
            <strong className="text-purple-700 dark:text-purple-300 font-bold">{recomputedVeryHigh}%</strong>
          </div>
          <div className="p-1.5 rounded bg-red-500/15 border border-red-500/30">
            <span className="text-[10px] font-sans block text-muted-foreground">High</span>
            <strong className="text-red-600 font-bold">{recomputedHigh}%</strong>
          </div>
          <div className="p-1.5 rounded bg-orange-500/15 border border-orange-500/30">
            <span className="text-[10px] font-sans block text-muted-foreground">Moderate</span>
            <strong className="text-orange-600 font-bold">{recomputedModerate}%</strong>
          </div>
          <div className="p-1.5 rounded bg-yellow-500/15 border border-yellow-500/30">
            <span className="text-[10px] font-sans block text-muted-foreground">Low</span>
            <strong className="text-yellow-600 font-bold">{recomputedLow}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
