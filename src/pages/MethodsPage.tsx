import React from "react";
import { ShieldAlert, BookOpen, Layers, Radio, BarChart2, CheckCircle2, Workflow, HelpCircle, ArrowRight } from "lucide-react";
import { PanelHeader } from "@/components/shared/PanelHeader";
import { LegendBar } from "@/components/shared/LegendBar";

export const MethodsPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8 w-full">
      {/* Title Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <BookOpen className="h-3.5 w-3.5" />
          <span>Scientific Documentation & Methodology</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Hydro-Geoprocessing & SAR Validation Principles
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Comprehensive scientific documentation on morphometric terrain analysis, factor weightings, topographic wetness index (TWI), and NISAR L-band radar observation validation.
        </p>
      </div>

      {/* Mandatory Guardrail Banner */}
      <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-3 shadow-sm">
        <div className="flex items-center gap-2.5 font-bold text-base">
          <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>MANDATORY SCIENTIFIC GUARDRAILS</span>
        </div>
        <ul className="text-xs space-y-2 list-disc pl-5 leading-relaxed">
          <li>
            <strong>Static Morphological Screening:</strong> Digital Elevation Models (DEMs) indicate morphological predisposition to water ponding and overland flow convergence. They do <strong>NOT</strong> predict real-time flood timing, flood depth, or storm event forecasts.
          </li>
          <li>
            <strong>Explainable Multi-Criteria Weighting:</strong> Every susceptibility score is fully deterministic and explainable via normalized factor contributions. No black-box or non-reproducible ML parameters are used.
          </li>
          <li>
            <strong>NISAR Radar Function:</strong> NISAR L-band SAR observations provide physical inundation extent mapping via backscatter thresholding (cross-pol &lt; -18 dB). <strong>NISAR does NOT provide DEM elevation rasters.</strong>
          </li>
        </ul>
      </div>

      {/* Interactive Geoprocessing Pipeline Diagram */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <PanelHeader
          title="End-to-End Geoprocessing Pipeline Diagram"
          subtitle="From GeoTIFF elevation raster to explainable screening output"
          icon={Workflow}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-2">
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1 text-center">
            <span className="font-bold text-foreground block">1. Input DEM</span>
            <span className="text-[11px] text-muted-foreground">Single-band GeoTIFF elevation raster</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1 text-center">
            <span className="font-bold text-foreground block">2. Pit-Filling Epsilon</span>
            <span className="text-[11px] text-muted-foreground">Depression conditioning & gradient enforcement</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1 text-center">
            <span className="font-bold text-foreground block">3. D8 Flow & Factors</span>
            <span className="text-[11px] text-muted-foreground">Slope, Concavity, TWI ln(a/tan beta)</span>
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-1 text-center">
            <span className="font-bold text-primary block">4. Susceptibility Score</span>
            <span className="text-[11px] text-muted-foreground">4-Step colorblind-safe screening output</span>
          </div>
        </div>
      </div>

      {/* Terminology Guide Table */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <PanelHeader
          title="Scientific Terminology Guide"
          subtitle="Distinguishing screening predisposition from real-time warnings"
          icon={HelpCircle}
        />

        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground font-semibold">
              <tr>
                <th className="p-3">Scientific Term</th>
                <th className="p-3">Definition & Physical Scope</th>
                <th className="p-3">What it DOES NOT mean</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30">
                <td className="p-3 font-bold text-primary">Flood Susceptibility</td>
                <td className="p-3 text-foreground">
                  Static terrain predisposition based on low elevation, flat slope, and concavity.
                </td>
                <td className="p-3 text-muted-foreground">
                  Does NOT indicate active flooding or real-time storm depth.
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-3 font-bold text-foreground">Flood Prediction</td>
                <td className="p-3 text-foreground">
                  Dynamic hydro-meteorological forecasting incorporating real-time precipitation radar & stream gages.
                </td>
                <td className="p-3 text-muted-foreground">
                  Is NOT computed solely from static DEM elevation rasters.
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-3 font-bold text-amber-600">Official Warning</td>
                <td className="p-3 text-foreground">
                  Official disaster alert issued exclusively by statutory authorities (IMD, CWC, NDMA, SDMA).
                </td>
                <td className="p-3 text-muted-foreground">
                  Cannot be generated by automated screening software tools.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Susceptibility Legend */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <PanelHeader
          title="Colorblind-Safe 4-Step Susceptibility Palette"
          subtitle="Standardized zone classification thresholds"
          icon={Layers}
        />
        <LegendBar compact={false} />
      </div>

      {/* Factor Definitions Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          <span>Multi-Criteria Factor Equations</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-foreground">1. Relative Elevation</h3>
              <span className="text-xs font-numeric tabular-nums font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                Weight: 0.35
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calculates local morphological elevation difference relative to surrounding ridge lines. Lowland depressions receive highest predisposition scores.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-foreground">2. Slope Flatness</h3>
              <span className="text-xs font-numeric tabular-nums font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                Weight: 0.30
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Slope angle measured in degrees. Slopes &lt; 3.0° restrict overland flow velocity, creating high ponding susceptibility.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-foreground">3. Curvature Concavity</h3>
              <span className="text-xs font-numeric tabular-nums font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                Weight: 0.20
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Laplacian curvature concavity filter. Positive values represent hollows and valleys that converge overland runoff.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-foreground">4. Topographic Wetness Index (TWI)</h3>
              <span className="text-xs font-numeric tabular-nums font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                Weight: 0.15
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calculated as <code>ln(a / tan β)</code>, where <em>a</em> is upslope contributing catchment area and <em>β</em> is local slope angle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
