import { motion } from "framer-motion";
import type { TerrainAnalysis } from "@/lib/terrain-analysis";

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

interface AnalysisPanelProps {
  analysis: TerrainAnalysis;
  overlay: OverlayMode;
  onOverlayChange: (mode: OverlayMode) => void;
  showContours: boolean;
  onContoursChange: (v: boolean) => void;
}

const overlays: { key: OverlayMode; label: string; color: string }[] = [
  { key: "none", label: "Elevation (DEM)", color: "text-neon-cyan" },
  { key: "susceptibility", label: "Flood Susceptibility", color: "text-neon-blue" },
  { key: "slope", label: "Slope Map", color: "text-neon-green" },
  { key: "aspect", label: "Aspect (Azimuth)", color: "text-neon-purple" },
  { key: "curvature", label: "Curvature / Hollows", color: "text-neon-cyan" },
  { key: "wetness", label: "Wetness Index Proxy", color: "text-neon-blue" },
  { key: "classification", label: "Landform Class", color: "text-neon-green" },
  { key: "instability", label: "Slope Instability", color: "text-orange-400" },
  { key: "roughness", label: "Terrain Roughness", color: "text-neon-purple" },
];

const Toggle = ({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{label}</span>
    <button
      onClick={onToggle}
      className={`w-10 h-5 rounded-full transition-colors duration-300 ${
        on ? "bg-neon-blue" : "bg-muted"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-foreground transition-transform duration-300 mx-0.5 ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

export default function AnalysisPanel({
  analysis,
  overlay,
  onOverlayChange,
  showContours,
  onContoursChange,
}: AnalysisPanelProps) {
  const { metrics } = analysis;
  const cls = metrics.classification;
  const susc = metrics.susceptibilitySummary;

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="w-full lg:w-96 p-6 border-b lg:border-b-0 lg:border-l border-white/5 space-y-7 overflow-y-auto max-h-[calc(100vh-5rem)] bg-background/25 backdrop-blur-md"
    >
      {/* Institutional Advisory Notice (Strict Scientific Guardrail 4) */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] leading-relaxed text-amber-200">
        <span className="font-semibold block text-amber-400 mb-1">
          Institutional Screening Notice
        </span>
        Advisory: terrain-based screening. Not an official warning. Consult IMD,
        CWC, NDMA or your State Disaster Management Authority (SDMA).
      </div>

      {/* Analysis Layer Selection */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-neon-blue/5 to-neon-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur" />
        <div className="relative">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-neon-blue"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Screening & Factor Layers
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {overlays.map((o) => {
              const isActive = overlay === o.key;
              return (
                <button
                  key={o.key}
                  onClick={() => onOverlayChange(o.key)}
                  className={`relative overflow-hidden group/btn px-3 py-2 rounded-xl text-[11px] font-medium transition-all duration-300 text-left ${
                    isActive
                      ? "bg-neon-blue/15 text-neon-cyan border border-neon-blue/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                      : "bg-white/5 text-muted-foreground border border-white/5 hover:border-white/10 hover:bg-white/10"
                  }`}
                >
                  <span className="relative z-10 block truncate">{o.label}</span>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/15 to-transparent opacity-60" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <Toggle
              on={showContours}
              onToggle={() => onContoursChange(!showContours)}
              label="Elevation Contours"
            />
          </div>
        </div>
      </div>

      {/* Explainable Factor Breakdown (Guardrail 6) */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-neon-cyan/5 to-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
              <svg
                className="w-4 h-4 text-neon-cyan"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Factor Explainability
            </h3>
            <span className="text-[10px] text-neon-cyan font-mono">Normalized</span>
          </div>

          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            Multi-criteria weighted overlay decomposes susceptibility into hydrological terrain drivers:
          </p>

          <div className="space-y-3">
            {susc.factorBreakdowns.map((f) => (
              <div
                key={f.name}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5"
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-semibold text-foreground/90">
                    {f.name}
                  </span>
                  <span className="font-mono text-xs text-neon-blue">
                    {(f.weight * 100).toFixed(0)}% weight
                  </span>
                </div>
                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-blue to-neon-cyan rounded-full"
                    style={{ width: `${f.contributionPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground/80 leading-normal">
                  {f.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Susceptibility Screening Distribution */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-neon-blue/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur" />
        <div className="relative">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-neon-blue"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Susceptibility Screening
          </h3>
          <span className="text-[10px] text-muted-foreground/70 block mb-3">
            Terrain predisposition distribution (static morphology)
          </span>

          <div className="space-y-2.5">
            {susc.zones.map((zone) => {
              const colorClass =
                zone.label === "Very High"
                  ? "bg-red-500 text-red-400"
                  : zone.label === "High"
                  ? "bg-orange-500 text-orange-400"
                  : zone.label === "Moderate"
                  ? "bg-amber-400 text-amber-300"
                  : "bg-emerald-500 text-emerald-400";

              return (
                <div key={zone.label} className="space-y-1">
                  <div className="flex justify-between items-baseline text-[11px]">
                    <span className="font-medium text-foreground/80">
                      {zone.label} Predisposition
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {zone.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${zone.percentage}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${colorClass.split(" ")[0]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Landform Classification Distribution */}
      <div className="relative group">
        <div className="relative">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-neon-green"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Landform Distribution
          </h3>
          <div className="space-y-2">
            {cls.labels.map((l) => (
              <div key={l} className="space-y-1">
                <div className="flex justify-between items-end text-[11px]">
                  <span className="capitalize text-foreground/80">{l}</span>
                  <span className="font-mono font-bold text-foreground text-xs">
                    {cls.percentages[l].toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neon-green/70 rounded-full"
                    style={{ width: `${cls.percentages[l]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scientific DEM Limitations Note (Guardrail 2 & 7) */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 text-[10px] text-muted-foreground leading-relaxed">
        <span className="font-semibold text-foreground/80 block">
          Topographic DEM Limitations:
        </span>
        <p>
          Terrain predisposition only; does not provide inundation depth, timing,
          or hydrodynamic routing. Resolution (~30 m) cannot resolve micro-drainage,
          levees, or culverts.
        </p>
      </div>
    </motion.div>
  );
}
