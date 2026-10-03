import { motion } from "framer-motion";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Radial gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-neon-blue/5 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-neon-purple/5 blur-[100px] animate-pulse-glow" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6 flex flex-wrap gap-2 justify-center"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-blue/30 bg-neon-blue/5 text-neon-blue text-sm font-mono">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            Explainable Terrain-Based Screening
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-muted-foreground text-xs font-mono">
            Validated with Sentinel-1 & NISAR L-Band SAR
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.05]"
        >
          <span className="gradient-text">Terrain Hazard</span>
          <br />
          <span className="text-foreground/90">Screening Platform</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed"
        >
          Compute hydrological terrain predisposition to produce explainable flood susceptibility screening from Digital Elevation Models. Validated against satellite SAR-derived flood extents (Sentinel-1 and NISAR L-band).
        </motion.p>

        {/* Scientific guardrail disclaimer banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="p-3.5 mb-8 rounded-xl bg-neon-blue/5 border border-neon-blue/20 text-xs text-muted-foreground max-w-2xl mx-auto text-left flex items-start gap-3"
        >
          <svg className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="space-y-1">
            <p className="font-semibold text-foreground/90">Scientific Scope & Guardrails</p>
            <p className="text-[11px] leading-relaxed">
              DEM-only output shows terrain predisposition. It does NOT give probability, timing, depth, or real event extent. NISAR does not provide elevation data; NISAR L-band SAR observations (via ASF DAAC) are used solely for deriving water extents to validate screening outputs.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={onGetStarted}
            className="group relative px-8 py-4 rounded-xl font-semibold text-primary-foreground overflow-hidden transition-all duration-300 hover:scale-[1.02] neon-glow-blue"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-purple" />
            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-purple opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <span className="relative z-10 flex items-center gap-2">
              Launch Screening Analyzer
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </span>
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-14 grid grid-cols-3 gap-8 max-w-lg mx-auto"
        >
          {[
            { value: "3D / 2D", label: "Interactive Terrain" },
            { value: "GeoTIFF", label: "Standard DEM Input" },
            { value: "100%", label: "Explainable Factors" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold gradient-text font-mono">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
