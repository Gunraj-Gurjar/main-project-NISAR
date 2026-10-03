import { motion } from "framer-motion";

const applications = [
  {
    title: "Hydrological Factor Derivation",
    description: "Derive slope, plan/profile curvature, Topographic Wetness Index (TWI), and flow accumulation from metric UTM-projected DEMs.",
    icon: (
      <svg className="w-8 h-8 text-neon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    title: "Explainable Flood Susceptibility",
    description: "Compute transparent terrain predisposition indices with configurable weights and exact per-factor score breakdowns. No unexplained red zones.",
    icon: (
      <svg className="w-8 h-8 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "SAR Observation Validation",
    description: "Benchmark terrain screening zones against empirical flood extents derived from Sentinel-1 and NISAR L-band SAR backscatter via ASF DAAC.",
    icon: (
      <svg className="w-8 h-8 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Rainfall-Aware Advisory Context",
    description: "Couple static terrain predisposition screening with rainfall anomalies (e.g. IMD/ERA5) for non-official pre-event situational screening.",
    icon: (
      <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
];

const ApplicationsSection = () => {
  return (
    <section className="min-h-screen pt-32 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text">Platform Capabilities</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          From metric DEM preprocessing and hydrological factor extraction to SAR empirical validation and explainable screening.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {applications.map((app, index) => (
          <motion.div
            key={app.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="group relative glass-card p-8 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            <div className="relative z-10 flex flex-col items-start gap-4">
              <div className="p-4 rounded-xl bg-background/50 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                {app.icon}
              </div>
              <h3 className="text-xl font-bold text-foreground/90">{app.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {app.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ApplicationsSection;
