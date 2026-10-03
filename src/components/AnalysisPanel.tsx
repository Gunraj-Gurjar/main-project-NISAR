import React from "react";
import { JobDetailResponse, ExplainResponse } from "@/lib/api";
import { TerrainAnalysis } from "@/lib/terrain-analysis";
import { PanelHeader } from "@/components/shared/PanelHeader";
import { StatusChip } from "@/components/shared/StatusChip";
import { BarChart3, HelpCircle, Layers, ShieldAlert, Activity, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type OverlayMode =
  | "none"
  | "susceptibility"
  | "slope"
  | "aspect"
  | "curvature"
  | "wetness"
  | "classification"
  | "instability"
  | "roughness";

interface DirectAnalysisPanelProps {
  jobId: string;
  jobData: JobDetailResponse;
  explainData?: ExplainResponse | null;
  loadingExplain?: boolean;
}

interface LegacyAnalysisPanelProps {
  analysis: TerrainAnalysis;
  overlay: OverlayMode;
  onOverlayChange: (mode: OverlayMode) => void;
  showContours: boolean;
  onContoursChange: (v: boolean) => void;
}

type AnalysisPanelProps = Partial<DirectAnalysisPanelProps> & Partial<LegacyAnalysisPanelProps>;

export default function AnalysisPanel(props: AnalysisPanelProps) {
  const { jobId, jobData, explainData, loadingExplain, analysis, overlay, onOverlayChange, showContours, onContoursChange } = props;

  const explainable = jobData?.explainable_breakdown;
  const factorContributions = explainable?.factor_contributions || [
    { factor_name: "Relative Elevation", weight: 0.35, mean_score: 0.45, contribution_percentage: 38, description: "Lowland morphological depression" },
    { factor_name: "Slope Flatness", weight: 0.30, mean_score: 0.52, contribution_percentage: 32, description: "Impeded overland flow velocity (<3 deg)" },
    { factor_name: "Curvature Concavity", weight: 0.20, mean_score: 0.38, contribution_percentage: 18, description: "Convergent flow concavity" },
    { factor_name: "Topographic Wetness Index", weight: 0.15, mean_score: 0.41, contribution_percentage: 12, description: "Steady-state accumulation proxy ln(a/tan beta)" },
  ];

  return (
    <div className="w-full p-5 rounded-2xl border border-border bg-card shadow-sm space-y-6">
      {/* Panel Header */}
      <PanelHeader
        title="Factor Explainability Engine"
        subtitle="Multi-criteria terrain factor weighting & inspector"
        icon={BarChart3}
        badge={<StatusChip status="done" label="Explainable" />}
      />

      {/* Point Explanation Inspector Output */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span>Point Inspector Analysis</span>
          </h3>
          {loadingExplain && <span className="text-xs text-primary animate-pulse">Inspecting...</span>}
        </div>

        {explainData ? (
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Selected Location Class:</span>
              <span className="text-xs font-bold font-numeric tabular-nums px-2.5 py-0.5 rounded bg-primary text-primary-foreground">
                {explainData.class} ({explainData.score.toFixed(2)})
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {explainData.summary}
            </p>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-foreground block">Factor Contributions at Point:</span>
              {explainData.contributions.map((c) => (
                <div key={c.factor} className="p-2 rounded-lg bg-card border border-border text-xs space-y-1">
                  <div className="flex justify-between items-center font-numeric tabular-nums">
                    <span className="font-semibold text-foreground">{c.factor}</span>
                    <span className="text-primary font-bold">{c.contribution_percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${c.contribution_percentage}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">No Location Selected</p>
            <p>Click any pixel on the 2D map viewer to inspect exact factor breakdown for that coordinate.</p>
          </div>
        )}
      </div>

      {/* Global Multi-Criteria Factor Weights */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span>Multi-Criteria Factor Breakdown</span>
        </h3>

        <div className="space-y-2.5">
          {factorContributions.map((fc) => (
            <div key={fc.factor_name} className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center text-xs font-numeric tabular-nums">
                <span className="font-semibold text-foreground">{fc.factor_name}</span>
                <span className="font-bold text-primary">{(fc.weight * 100).toFixed(0)}% Weight</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${fc.contribution_percentage}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">{fc.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scientific Limitations Guardrail Note */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Scientific Guardrail:</strong> Terrain screening factors represent static morphological predisposition to ponding. Does not model hydrodynamic wave front propagation or timing.
        </span>
      </div>
    </div>
  );
}
